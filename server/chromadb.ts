import { ChromaClient, Collection, OpenAIEmbeddingFunction } from 'chromadb';
import { createTitanEmbedding } from './awsBedrock';
import path from 'path';
import fs from 'fs';

// Initialize Chroma client
const client = new ChromaClient();

// Map of forum categories to collection names
const COLLECTION_NAMES = {
  technical: "technical_support_docs",
  ideas: "product_ideas_docs",
  general: "general_queries_docs",
  hr: "hr_onboarding_docs"
};

// Custom embedding function using Amazon Titan
class TitanEmbeddingFunction {
  async generate(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    for (const text of texts) {
      try {
        const embedding = await createTitanEmbedding(text);
        embeddings.push(embedding);
      } catch (error) {
        console.error("Error generating embedding:", error);
        throw error;
      }
    }
    
    return embeddings;
  }
}

// Initialize the embedding function
const embeddingFunction = new TitanEmbeddingFunction();

/**
 * Initialize collections for each forum category
 */
export async function initializeCollections() {
  try {
    for (const category of Object.keys(COLLECTION_NAMES)) {
      const collectionName = COLLECTION_NAMES[category];
      
      // Check if collection exists
      const collections = await client.listCollections();
      const exists = collections.some(collection => collection.name === collectionName);
      
      if (!exists) {
        await client.createCollection({
          name: collectionName,
          embeddingFunction
        });
        console.log(`Created collection: ${collectionName}`);
      } else {
        console.log(`Collection ${collectionName} already exists.`);
      }
    }
  } catch (error) {
    console.error("Error initializing collections:", error);
    throw error;
  }
}

/**
 * Get a collection by forum category
 * @param category Forum category
 * @returns ChromaDB Collection
 */
export async function getCollection(category: string): Promise<Collection> {
  const collectionName = COLLECTION_NAMES[category];
  if (!collectionName) {
    throw new Error(`Invalid category: ${category}`);
  }
  
  return await client.getCollection({
    name: collectionName,
    embeddingFunction
  });
}

/**
 * Add document to vector store
 * @param docId Document ID
 * @param content Document content
 * @param metadata Document metadata
 * @param category Forum category
 */
export async function addDocument(
  docId: string,
  content: string,
  metadata: Record<string, any>,
  category: string
): Promise<string> {
  try {
    const collection = await getCollection(category);
    
    await collection.add({
      ids: [docId],
      documents: [content],
      metadatas: [metadata]
    });
    
    return docId;
  } catch (error) {
    console.error("Error adding document to vector store:", error);
    throw error;
  }
}

/**
 * Process and embed document file
 * @param filePath Path to document file
 * @param metadata Document metadata
 * @param category Forum category
 */
export async function processDocument(
  filePath: string,
  metadata: Record<string, any>,
  category: string
): Promise<string> {
  try {
    // Read file content (in a real implementation, this would handle different file types)
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Generate a unique document ID
    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    // Add to vector store
    await addDocument(docId, content, metadata, category);
    
    return docId;
  } catch (error) {
    console.error("Error processing document:", error);
    throw error;
  }
}

/**
 * Query documents by similarity
 * @param query Query text
 * @param category Forum category
 * @param limit Maximum number of results
 * @returns Query results
 */
export async function queryDocuments(
  query: string,
  category: string,
  limit: number = 5
): Promise<any> {
  try {
    const collection = await getCollection(category);
    
    const results = await collection.query({
      queryTexts: [query],
      nResults: limit
    });
    
    return results;
  } catch (error) {
    console.error("Error querying documents:", error);
    throw error;
  }
}

/**
 * Get contextual data for a query
 * @param query User query
 * @param category Forum category
 * @returns Context string from relevant documents
 */
export async function getContextForQuery(
  query: string,
  category: string
): Promise<string> {
  try {
    const results = await queryDocuments(query, category);
    
    if (!results.documents[0] || results.documents[0].length === 0) {
      return "";
    }
    
    // Combine the top relevant documents into a context string
    let context = "Relevant information from documents:\n\n";
    
    for (let i = 0; i < results.documents[0].length; i++) {
      const doc = results.documents[0][i];
      const metadata = results.metadatas[0][i];
      const docName = metadata.name || "Document";
      
      // Add document information with content
      context += `${docName}:\n${doc}\n\n`;
    }
    
    return context;
  } catch (error) {
    console.error("Error getting context for query:", error);
    return ""; // Return empty string on error
  }
}

/**
 * Delete document from vector store
 * @param docId Document ID
 * @param category Forum category
 */
export async function deleteDocument(docId: string, category: string): Promise<void> {
  try {
    const collection = await getCollection(category);
    await collection.delete({ ids: [docId] });
  } catch (error) {
    console.error("Error deleting document:", error);
    throw error;
  }
}

// Initialize collections on startup
initializeCollections().catch(err => {
  console.error("Failed to initialize ChromaDB collections:", err);
});
