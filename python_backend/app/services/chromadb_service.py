import chromadb
import os
import logging
from chromadb.utils import embedding_functions
from .bedrock import create_titan_embedding
import time
import random

# Configure logging
logger = logging.getLogger(__name__)

# ChromaDB persistence directory
CHROMA_PERSISTENCE_DIR = os.path.join(os.getcwd(), "chroma_db")

# Collection names for different forum categories
COLLECTIONS = {
    "technical_support": "technical_support_docs",
    "product_ideas": "product_ideas_docs",
    "general_queries": "general_queries_docs",
    "hr_onboarding": "hr_onboarding_docs"
}

# Initialize ChromaDB client
try:
    client = chromadb.PersistentClient(path=CHROMA_PERSISTENCE_DIR)
    logger.info("ChromaDB initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize ChromaDB: {str(e)}")
    client = None

# Custom embedding function using AWS Bedrock Titan model
class TitanEmbeddingFunction:
    def __call__(self, input):
        # Handle both single text and list of texts
        if isinstance(input, list):
            texts = input
        else:
            texts = [input]
        
        embeddings = []
        for text in texts:
            try:
                embedding = create_titan_embedding(text)
                embeddings.append(embedding)
            except Exception as e:
                logger.error(f"Error creating embedding: {str(e)}")
                # Return a random embedding as fallback (not for production)
                fallback_embedding = [random.uniform(-1, 1) for _ in range(1536)]
                embeddings.append(fallback_embedding)
        
        # Return single embedding if input was single text
        if not isinstance(input, list):
            return embeddings[0]
        return embeddings

def get_collection_name(category):
    """Get collection name for a forum category"""
    return COLLECTIONS.get(category, "general_queries_docs")

def initialize_collections():
    """Initialize ChromaDB collections for each forum category"""
    if not client:
        logger.warning("Running without ChromaDB - document embeddings will not be available")
        return False
    
    try:
        titan_ef = TitanEmbeddingFunction()
        
        # Create collections for each forum category
        for collection_name in COLLECTIONS.values():
            try:
                client.get_collection(name=collection_name, embedding_function=titan_ef)
                logger.info(f"Collection {collection_name} already exists.")
            except:
                client.create_collection(name=collection_name, embedding_function=titan_ef)
                logger.info(f"Created collection: {collection_name}")
        
        logger.info("ChromaDB initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Error initializing ChromaDB collections: {str(e)}")
        return False

def process_document(file_path, metadata, category):
    """Process and embed document file
    
    Args:
        file_path (str): Path to document file
        metadata (dict): Document metadata
        category (str): Forum category
        
    Returns:
        str: Embedding ID
    """
    if not client:
        logger.warning("ChromaDB not available - document embeddings skipped")
        return f"no_embedding_{int(time.time())}"
    
    try:
        # Read file content
        with open(file_path, 'r', errors='ignore') as f:
            content = f.read()
        
        # Get collection
        collection_name = get_collection_name(category)
        collection = client.get_collection(name=collection_name)
        
        # Generate document ID
        doc_id = f"doc_{metadata['id']}_{int(time.time())}"
        
        # Add document to collection
        collection.add(
            documents=[content],
            metadatas=[metadata],
            ids=[doc_id]
        )
        
        logger.info(f"Document processed and embedded: {doc_id}")
        return doc_id
    
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}")
        raise Exception(f"Error processing document: {str(e)}")

def get_context_for_query(query, category, max_results=5):
    """Get contextual data for a query
    
    Args:
        query (str): User query
        category (str): Forum category
        max_results (int): Maximum number of results to return
        
    Returns:
        str: Context string from relevant documents
    """
    if not client:
        logger.warning("ChromaDB not available - unable to get context for query")
        return None
    
    try:
        # Get collection
        collection_name = get_collection_name(category)
        collection = client.get_collection(name=collection_name)
        
        # Query collection
        results = collection.query(
            query_texts=[query],
            n_results=max_results
        )
        
        # If no results found
        if not results or not results['documents'] or not results['documents'][0]:
            return None
        
        # Build context string from results
        context_parts = []
        
        for i, doc in enumerate(results['documents'][0]):
            metadata = results['metadatas'][0][i]
            doc_name = metadata.get('name', 'Unnamed document')
            doc_type = metadata.get('documentType', 'Unknown type')
            
            # Truncate doc if it's too long
            if len(doc) > 1000:
                doc = doc[:1000] + "..."
            
            context_parts.append(f"Document: {doc_name} (Type: {doc_type})\nContent: {doc}\n")
        
        return "\n".join(context_parts)
    
    except Exception as e:
        logger.error(f"Error getting context for query: {str(e)}")
        return None

def delete_document(doc_id, category):
    """Delete document from vector store
    
    Args:
        doc_id (str): Document ID
        category (str): Forum category
    """
    if not client:
        logger.warning("ChromaDB not available - document deletion skipped")
        return
    
    try:
        # Get collection
        collection_name = get_collection_name(category)
        collection = client.get_collection(name=collection_name)
        
        # Delete document
        collection.delete(ids=[doc_id])
        
        logger.info(f"Document deleted from vector store: {doc_id}")
    
    except Exception as e:
        logger.error(f"Error deleting document: {str(e)}")
        raise Exception(f"Error deleting document: {str(e)}")