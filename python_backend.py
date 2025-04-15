"""
Python backend server for X-AI Forum platform.
This file is simplified to run independently of the TypeScript server.
"""
from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import logging
import sys
import random
import json
import time

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger('python-backend')

# Initialize Flask app
app = Flask(__name__)
CORS(app, 
     supports_credentials=True, 
     origins=["http://localhost:5000", "https://localhost:5000", "https://0.0.0.0:5000", "*"])


# ======= Mock Services =======

class MockChromatDBService:
    def initialize_collections(self):
        logger.info("Initialized mock ChromaDB collections")
        return True
    
    def get_context_for_query(self, query, category, max_results=5):
        logger.info(f"Mock getting context for query: {query} in category: {category}")
        return f"Context data for query: {query} in category: {category}"
    
    def process_document(self, file_path, metadata, category):
        logger.info(f"Mock processing document: {file_path} for category: {category}")
        return f"doc_{metadata.get('id', 'unknown')}_{int(time.time())}"
    
    def delete_document(self, doc_id, category):
        logger.info(f"Mock deleting document: {doc_id} from category: {category}")
        return True

class MockBedrockService:
    def generate_ai_response(self, query, chat_history, category, contextual_data=None):
        logger.info(f"Mock generating AI response for: {query} in category: {category}")
        return f"AI response to: {query} based on context from {category} category."

# Initialize mock services
chromadb_service = MockChromatDBService()
bedrock_service = MockBedrockService()

# ======= API Routes =======

@app.route('/')
def index():
    return jsonify({
        "message": "X-AI Forum Python Backend API",
        "status": "operational"
    })

@app.route('/health')
def health():
    return jsonify({
        "status": "healthy", 
        "message": "Python Flask backend is running!",
        "timestamp": time.time()
    })

@app.route('/api/health')
def api_health():
    return jsonify({
        "status": "healthy", 
        "message": "Python API is operational",
        "timestamp": time.time()
    })

# Documents endpoints
@app.route('/api/documents', methods=['GET'])
def get_documents():
    category = request.args.get('category', 'general')
    logger.info(f"Getting documents for category: {category}")
    documents = [
        {"id": 1, "name": "Company Policy", "category": category, "documentType": "policy"},
        {"id": 2, "name": "User Guide", "category": category, "documentType": "guide"},
        {"id": 3, "name": "Technical Specs", "category": category, "documentType": "specifications"}
    ]
    return jsonify(documents)

@app.route('/api/documents/<int:doc_id>', methods=['GET'])
def get_document(doc_id):
    logger.info(f"Getting document: {doc_id}")
    document = {
        "id": doc_id,
        "name": f"Document {doc_id}",
        "category": "general",
        "documentType": "guide",
        "uploadedBy": 1,
        "filePath": f"/path/to/document_{doc_id}.pdf",
        "createdAt": "2025-04-15T12:00:00Z"
    }
    return jsonify(document)

# AI Chat endpoints
@app.route('/api/ai-chats', methods=['POST'])
def create_chat():
    data = request.json
    logger.info(f"Creating new chat with data: {data}")
    new_chat = {
        "id": random.randint(1, 1000),
        "userId": data.get('userId', 1),
        "category": data.get('category', 'general'),
        "createdAt": "2025-04-15T12:00:00Z"
    }
    return jsonify(new_chat), 201

@app.route('/api/ai-chats/<int:chat_id>/messages', methods=['GET'])
def get_chat_messages(chat_id):
    logger.info(f"Getting messages for chat: {chat_id}")
    messages = [
        {
            "id": 1,
            "chatId": chat_id,
            "content": "How can I help you today?",
            "isUserMessage": False,
            "createdAt": "2025-04-15T12:01:00Z"
        },
        {
            "id": 2,
            "chatId": chat_id,
            "content": "I have a question about our company policies.",
            "isUserMessage": True,
            "createdAt": "2025-04-15T12:02:00Z"
        },
        {
            "id": 3,
            "chatId": chat_id,
            "content": "I'd be happy to help with that. What specifically would you like to know about our company policies?",
            "isUserMessage": False,
            "createdAt": "2025-04-15T12:03:00Z"
        }
    ]
    return jsonify(messages)

@app.route('/api/ai-chats/<int:chat_id>/messages', methods=['POST'])
def create_chat_message(chat_id):
    data = request.json
    logger.info(f"Creating message for chat {chat_id}: {data}")
    
    # Save user message
    user_message = {
        "id": random.randint(1, 1000),
        "chatId": chat_id,
        "content": data.get('content', ''),
        "isUserMessage": True,
        "createdAt": "2025-04-15T12:04:00Z"
    }
    
    # Generate AI response
    category = "general"  # In a real app, you'd get this from the chat data
    query = data.get('content', '')
    chat_history = []  # In a real app, you'd get previous messages
    
    # Get context from ChromaDB
    contextual_data = chromadb_service.get_context_for_query(query, category)
    
    # Generate AI response
    ai_response = bedrock_service.generate_ai_response(
        query, chat_history, category, contextual_data
    )
    
    # Save AI response
    ai_message = {
        "id": random.randint(1001, 2000),
        "chatId": chat_id,
        "content": ai_response,
        "isUserMessage": False,
        "createdAt": "2025-04-15T12:05:00Z"
    }
    
    return jsonify(ai_message), 201

# Add this catch-all route to help with debugging
@app.route('/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def catch_all(path):
    logger.info(f"Received request for undefined route: {path}")
    logger.info(f"Method: {request.method}, Headers: {request.headers}")
    
    if request.json:
        logger.info(f"JSON payload: {request.json}")
    
    return jsonify({
        "error": "Route not found",
        "path": path,
        "method": request.method
    }), 404

# Run the application
if __name__ == "__main__":
    # Use port 5001 by default for Python backend
    port = int(os.environ.get('PORT', 5001))
    logger.info(f"Starting Python backend on port {port}")
    
    # Initialize services
    chromadb_service.initialize_collections()
    
    # Run the Flask app
    app.run(host='0.0.0.0', port=port, debug=True)