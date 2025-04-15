import { createTitanEmbedding } from './awsBedrock';
import path from 'path';
import fs from 'fs';

// Map of forum categories to collection names
const COLLECTION_NAMES: Record<string, string> = {
  technical: "technical_support_docs",
  ideas: "product_ideas_docs",
  general: "general_queries_docs",
  hr: "hr_onboarding_docs"
};

// Mock results for when ChromaDB is not available
const EMPTY_RESULT = { 
  documents: [[]], 
  metadatas: [[]], 
  distances: [[]], 
  ids: [[]] 
};

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
    // Just read the file to confirm it exists, but we won't do vector embeddings
    fs.readFileSync(filePath, 'utf8');
    
    // Generate a unique document ID
    return `doc_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  } catch (error) {
    console.error("Error processing document:", error);
    // Return a placeholder ID instead of throwing to avoid breaking document uploads
    return `error_${Date.now()}`;
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
  // Return empty string since ChromaDB is not available
  return "";
}

/**
 * Delete document from vector store
 * @param docId Document ID
 * @param category Forum category
 */
export async function deleteDocument(docId: string, category: string): Promise<void> {
  // No-op since ChromaDB is not available
  return;
}

// Initialize collections placeholders
export async function initializeCollections() {
  console.log("ChromaDB not available - running without vector storage");
  return;
}

console.log("Running without ChromaDB vector storage - document embeddings will not be available");
