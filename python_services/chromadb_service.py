"""
ChromaDB vector database service for X-AI Forum.
Handles document embeddings and similarity search.
"""
import os
import logging
import json
from typing import List, Dict, Any, Optional, Union
import tempfile
import shutil
import uuid

# Import services
from python_services.bedrock_service import bedrock_service

# Setup logging
logger = logging.getLogger('chromadb-service')

# Try to import ChromaDB - it's optional, we'll fall back if not available
try:
    import chromadb
    from chromadb.utils import embedding_functions
    CHROMADB_AVAILABLE = True
    logger.info("ChromaDB is available")
except ImportError:
    CHROMADB_AVAILABLE = False
    logger.warning("ChromaDB is not available - document embeddings will not be available")

# Directory where embeddings are stored
CHROMADB_DIR = os.path.join(os.getcwd(), "chroma_db")

class ChromaDBService:
    def __init__(self):
        """Initialize ChromaDB service."""
        self.client = None
        self.collections = {}
        self.embedding_function = None
        
        if CHROMADB_AVAILABLE:
            try:
                # Make sure the directory exists
                os.makedirs(CHROMADB_DIR, exist_ok=True)
                
                # Initialize client
                self.client = chromadb.PersistentClient(path=CHROMADB_DIR)
                
                # Use AWS Bedrock (Titan) for embeddings
                self.embedding_function = self._create_bedrock_embedding_function()
                
                # Initialize collections
                self.initialize_collections()
                
                logger.info("ChromaDB service initialized")
            except Exception as e:
                logger.error(f"ChromaDB initialization error: {str(e)}")
                self.client = None
        else:
            logger.warning("ChromaDB service not available")
    
    def _create_bedrock_embedding_function(self):
        """Create embedding function using AWS Bedrock."""
        def _bedrock_embeddings(texts: Union[str, List[str]]) -> List[List[float]]:
            # Handle both single texts and lists
            if isinstance(texts, str):
                texts = [texts]
            
            results = []
            for text in texts:
                try:
                    embedding = bedrock_service.create_embedding(text)
                    results.append(embedding)
                except Exception as e:
                    logger.error(f"Error creating embedding: {str(e)}")
                    # Return a zero vector as fallback
                    results.append([0.0] * 1536)
            
            return results
            
        return _bedrock_embeddings
        
    def initialize_collections(self):
        """Initialize collections for each forum category."""
        if not self.client or not self.embedding_function:
            logger.warning("Cannot initialize collections - ChromaDB not available")
            return
        
        try:
            # Define categories
            categories = ["general", "technical", "hr", "sales", "management"]
            
            for category in categories:
                collection_name = f"documents_{category}"
                try:
                    # Get collection if it exists, or create it
                    collection = self.client.get_or_create_collection(
                        name=collection_name,
                        embedding_function=self.embedding_function
                    )
                    self.collections[category] = collection
                    logger.info(f"Initialized collection for category: {category}")
                except Exception as e:
                    logger.error(f"Error initializing collection for {category}: {str(e)}")
        
        except Exception as e:
            logger.error(f"Error in initialize_collections: {str(e)}")
    
    def get_context_for_query(self, query, category, max_results=5):
        """
        Get contextual data for a query.
        
        Args:
            query: User query
            category: Forum category
            max_results: Maximum number of results to return
            
        Returns:
            String with contextual information from relevant documents
        """
        if not self.client or category not in self.collections:
            logger.warning(f"Cannot get context - ChromaDB not available or category {category} not found")
            return None
        
        try:
            collection = self.collections[category]
            
            # Query the collection
            results = collection.query(
                query_texts=[query],
                n_results=max_results
            )
            
            if not results or not results['documents'] or not results['documents'][0]:
                return None
                
            # Combine document texts with metadata
            context_parts = []
            documents = results['documents'][0]
            metadatas = results['metadatas'][0]
            
            for i, doc_text in enumerate(documents):
                metadata = metadatas[i]
                source = metadata.get('name', 'Unknown document')
                doc_type = metadata.get('documentType', 'document')
                
                context_parts.append(f"--- From {source} ({doc_type}) ---\n{doc_text}\n")
            
            return "\n".join(context_parts)
            
        except Exception as e:
            logger.error(f"Error getting context for query: {str(e)}")
            return None
    
    def process_document(self, file_path, metadata, category):
        """
        Process and embed document file.
        
        Args:
            file_path: Path to document file
            metadata: Document metadata
            category: Forum category
            
        Returns:
            Document ID if successful, None otherwise
        """
        if not self.client or category not in self.collections:
            logger.warning(f"Cannot process document - ChromaDB not available or category {category} not found")
            return None
        
        try:
            collection = self.collections[category]
            
            # Generate a unique ID for the document
            doc_id = str(uuid.uuid4())
            
            # Extract text from file - this is a simplified version
            # For production, use a proper document extraction method based on file type
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
            
            # Add to collection with metadata
            collection.add(
                ids=[doc_id],
                documents=[text],
                metadatas=[metadata]
            )
            
            logger.info(f"Processed document {metadata.get('name')} for category {category}")
            return doc_id
            
        except Exception as e:
            logger.error(f"Error processing document: {str(e)}")
            return None
    
    def delete_document(self, doc_id, category):
        """
        Delete document from vector store.
        
        Args:
            doc_id: Document ID
            category: Forum category
        """
        if not self.client or category not in self.collections:
            logger.warning(f"Cannot delete document - ChromaDB not available or category {category} not found")
            return
        
        try:
            collection = self.collections[category]
            collection.delete(ids=[doc_id])
            logger.info(f"Deleted document {doc_id} from category {category}")
            
        except Exception as e:
            logger.error(f"Error deleting document: {str(e)}")

# Create singleton instance
chromadb_service = ChromaDBService()