"""
Updated Python backend server for X-AI Forum platform.
This version uses real AWS Bedrock and Slack services.
"""
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import os
import logging
import sys
import random
import json
import time
import traceback
import uuid
from werkzeug.utils import secure_filename

# Import our service implementations
from python_services.bedrock_service import bedrock_service
from python_services.slack_service import slack_service
from python_services.chromadb_service import chromadb_service

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
     origins=["http://localhost:5000", "https://localhost:5000", 
              "https://0.0.0.0:5000", "*"])

# Configure upload settings
UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
    
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB max upload size
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'md'}

# ======= Helper functions =======

def format_time():
    """Return current time in ISO format."""
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

def allowed_file(filename):
    """Check if the file extension is allowed."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# ======= API Routes =======

@app.route('/')
def index():
    return jsonify({
        "message": "X-AI Forum Python Backend API",
        "status": "operational",
        "timestamp": format_time()
    })

@app.route('/health')
def health():
    # Check service statuses
    aws_status = "healthy" if bedrock_service.client else "unavailable"
    slack_status = "healthy" if slack_service.client else "unavailable"
    chromadb_status = "healthy" if chromadb_service.client else "unavailable"
    
    return jsonify({
        "status": "healthy", 
        "message": "Python Flask backend is running!",
        "services": {
            "aws_bedrock": aws_status,
            "slack": slack_status,
            "chromadb": chromadb_status
        },
        "timestamp": format_time()
    })

@app.route('/api/health')
def api_health():
    return jsonify({
        "status": "healthy", 
        "message": "Python API is operational",
        "timestamp": format_time()
    })

# Documents endpoints
@app.route('/api/documents', methods=['GET'])
def get_documents():
    category = request.args.get('category', 'general')
    logger.info(f"Getting documents for category: {category}")
    
    # In a real implementation, this would fetch from a database
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
        "createdAt": format_time()
    }
    return jsonify(document)

@app.route('/api/documents/upload', methods=['POST'])
def upload_document():
    """Upload a document and process it for embeddings."""
    logger.info("Document upload request received")
    
    # Check if there's a file in the request
    if 'file' not in request.files:
        logger.error("No file part in request")
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    
    # Check if a filename is provided
    if file.filename == '':
        logger.error("No file selected")
        return jsonify({"error": "No file selected"}), 400
        
    # Check if the file type is allowed
    if file and allowed_file(file.filename):
        # Generate a secure filename
        filename = secure_filename(file.filename)
        
        # Add timestamp to avoid filename collisions
        filename = f"{int(time.time())}_{filename}"
        
        # Get file metadata from form data
        category = request.form.get('category', 'general')
        document_type = request.form.get('documentType', 'document')
        user_id = request.form.get('userId', '1')
        name = request.form.get('name', filename)
        
        # Save the file
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # Generate a document ID
        doc_id = random.randint(1, 10000)
        
        # Create document metadata for ChromaDB
        metadata = {
            "id": doc_id,
            "name": name,
            "category": category,
            "documentType": document_type,
            "uploadedBy": int(user_id),
            "filePath": file_path,
            "createdAt": format_time()
        }
        
        # Process document with ChromaDB if available
        chroma_doc_id = None
        if chromadb_service.client:
            try:
                chroma_doc_id = chromadb_service.process_document(file_path, metadata, category)
                if chroma_doc_id:
                    logger.info(f"Document processed successfully with ChromaDB, ID: {chroma_doc_id}")
                    metadata["chromaId"] = chroma_doc_id
                else:
                    logger.warning("Document was not processed by ChromaDB")
            except Exception as e:
                logger.error(f"Error processing document with ChromaDB: {str(e)}")
        
        # Document successfully uploaded
        logger.info(f"Document uploaded successfully: {file_path}")
        
        # Return the document metadata
        return jsonify({
            "message": "Document uploaded successfully",
            "document": metadata
        }), 201
    else:
        # Invalid file type
        logger.error(f"Invalid file type: {file.filename}")
        return jsonify({
            "error": "Invalid file type",
            "allowedTypes": list(ALLOWED_EXTENSIONS)
        }), 400
        
@app.route('/api/uploads/<path:filename>')
def download_file(filename):
    """Get an uploaded file by filename."""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# AI Chat endpoints
@app.route('/api/ai-chats', methods=['POST'])
def create_chat():
    data = request.json
    logger.info(f"Creating new chat with data: {data}")
    new_chat = {
        "id": random.randint(1, 1000),
        "userId": data.get('userId', 1),
        "category": data.get('category', 'general'),
        "createdAt": format_time()
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
    query = data.get('content', '')
    category = data.get('category', 'general')
    
    logger.info(f"Creating message for chat {chat_id}: {data}")
    
    # Save user message (this would go to a database in a real app)
    user_message = {
        "id": random.randint(1, 1000),
        "chatId": chat_id,
        "content": query,
        "isUserMessage": True,
        "createdAt": format_time()
    }
    
    try:
        # Generate AI response using AWS Bedrock
        # In a real app, you'd get previous messages from database
        chat_history = []
        
        # Get contextual data from ChromaDB using embeddings
        contextual_data = None
        if chromadb_service.client:
            try:
                contextual_data = chromadb_service.get_context_for_query(query, category)
                if contextual_data:
                    logger.info(f"Retrieved contextual data for query from ChromaDB")
                else:
                    logger.info(f"No contextual data found for query in category: {category}")
            except Exception as chroma_err:
                logger.error(f"Error retrieving contextual data: {str(chroma_err)}")
        
        # Generate AI response
        ai_response = bedrock_service.generate_ai_response(
            query, chat_history, category, contextual_data
        )
        
        # Save AI response (this would go to a database in a real app)
        ai_message = {
            "id": random.randint(1001, 2000),
            "chatId": chat_id,
            "content": ai_response,
            "isUserMessage": False,
            "createdAt": format_time()
        }
        
        # Also post to Slack if configured
        try:
            if slack_service.client:
                slack_message = f"*AI Chat Question:* {query}\n\n*AI Response:* {ai_response}"
                slack_service.send_message(slack_message)
        except Exception as slack_error:
            logger.error(f"Error posting to Slack: {str(slack_error)}")
        
        return jsonify(ai_message), 201
        
    except Exception as e:
        logger.error(f"Error generating AI response: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Return a fallback response
        error_message = {
            "id": random.randint(1001, 2000),
            "chatId": chat_id,
            "content": f"I'm sorry, I encountered an error processing your request. Please try again later.",
            "isUserMessage": False,
            "createdAt": format_time()
        }
        return jsonify(error_message), 201

# Slack webhook endpoint for events
@app.route('/api/slack/events', methods=['POST'])
def slack_events():
    data = request.json
    logger.info(f"Received Slack event: {data}")
    
    try:
        # Verify Slack challenge if needed
        if data.get('type') == 'url_verification':
            return jsonify({"challenge": data.get('challenge')})
        
        # Handle event callback
        if data.get('type') == 'event_callback':
            event = data.get('event', {})
            
            # Handle only if bot is mentioned
            if slack_service.is_bot_mentioned(event.get('text', '')):
                # Extract query
                query = slack_service.extract_query(event.get('text', ''))
                
                # Get contextual data for the query
                contextual_data = None
                if chromadb_service.client:
                    try:
                        contextual_data = chromadb_service.get_context_for_query(query, 'general')
                        if contextual_data:
                            logger.info(f"Retrieved contextual data for Slack query")
                        else:
                            logger.info(f"No contextual data found for Slack query")
                    except Exception as chroma_err:
                        logger.error(f"Error retrieving contextual data for Slack: {str(chroma_err)}")
                        
                # Generate AI response with context
                ai_response = bedrock_service.generate_ai_response(
                    query, [], 'general', contextual_data
                )
                
                # Send response back to Slack
                slack_service.send_message(
                    ai_response,
                    event.get('channel'),
                    event.get('thread_ts') or event.get('ts')
                )
        
        return jsonify({"status": "ok"})
    
    except Exception as e:
        logger.error(f"Error handling Slack event: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"status": "error", "message": str(e)}), 500

# Add this catch-all route to help with debugging
@app.route('/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def catch_all(path):
    logger.info(f"Received request for undefined route: {path}")
    logger.info(f"Method: {request.method}, Headers: {dict(request.headers)}")
    
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
    
    # Check if AWS Bedrock is available
    has_bedrock = bedrock_service.client is not None
    logger.info(f"AWS Bedrock service: {'Available' if has_bedrock else 'Unavailable'}")
    
    # Check if Slack is available
    has_slack = slack_service.client is not None
    logger.info(f"Slack service: {'Available' if has_slack else 'Unavailable'}")
    
    # Check if ChromaDB is available
    has_chromadb = chromadb_service.client is not None
    logger.info(f"ChromaDB service: {'Available' if has_chromadb else 'Unavailable'}")
    
    # Run the Flask app
    app.run(host='0.0.0.0', port=port, debug=True)