from flask import Blueprint, request, jsonify, session
from ..models.storage import storage
from ..services.bedrock import generate_forum_ai_response
from ..services.chromadb_service import get_context_for_query

chat_bp = Blueprint('chat', __name__)

# Authentication middleware
def is_authenticated():
    return 'user_id' in session

@chat_bp.route('', methods=['POST'])
def create_chat():
    try:
        # Check authentication
        if not is_authenticated():
            return jsonify({'message': 'Unauthorized'}), 401
        
        # Get user ID from session
        user_id = session['user_id']
        
        # Get request data
        data = request.get_json()
        
        # Validate required fields
        if 'category' not in data or not data['category']:
            return jsonify({'message': 'Category is required'}), 400
        
        # Create chat
        chat_data = {
            'userId': user_id,
            'category': data['category']
        }
        
        chat = storage.create_ai_chat(chat_data)
        
        return jsonify(chat), 201
        
    except Exception as e:
        print(f"Error in create_chat: {str(e)}")
        return jsonify({'message': str(e)}), 500

@chat_bp.route('', methods=['GET'])
def get_user_chats():
    try:
        # Check authentication
        if not is_authenticated():
            return jsonify({'message': 'Unauthorized'}), 401
        
        # Get user ID from session
        user_id = session['user_id']
        
        # Get chats
        chats = storage.get_ai_chats_by_user_id(user_id)
        
        return jsonify(chats), 200
        
    except Exception as e:
        print(f"Error in get_user_chats: {str(e)}")
        return jsonify({'message': str(e)}), 500

@chat_bp.route('/<int:chat_id>', methods=['GET'])
def get_chat(chat_id):
    try:
        # Check authentication
        if not is_authenticated():
            return jsonify({'message': 'Unauthorized'}), 401
        
        # Get chat
        chat = storage.get_ai_chat(chat_id)
        if not chat:
            return jsonify({'message': 'Chat not found'}), 404
        
        # Get messages
        messages = storage.get_ai_chat_messages(chat_id)
        
        # Build response
        response = {
            'chat': chat,
            'messages': messages
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        print(f"Error in get_chat: {str(e)}")
        return jsonify({'message': str(e)}), 500

@chat_bp.route('/<int:chat_id>/messages', methods=['POST'])
def create_message(chat_id):
    try:
        # Check authentication
        if not is_authenticated():
            return jsonify({'message': 'Unauthorized'}), 401
        
        # Get chat
        chat = storage.get_ai_chat(chat_id)
        if not chat:
            return jsonify({'message': 'Chat not found'}), 404
        
        # Get request data
        data = request.get_json()
        
        # Validate content
        if 'content' not in data or not data['content']:
            return jsonify({'message': 'Content is required'}), 400
        
        user_message_content = data['content']
        
        # Save user message
        user_message = storage.create_ai_chat_message({
            'chatId': chat_id,
            'content': user_message_content,
            'isUserMessage': True
        })
        
        # Get previous messages for context
        previous_messages = storage.get_ai_chat_messages(chat_id)
        chat_history = []
        
        for msg in previous_messages:
            if msg['id'] != user_message['id']:  # Exclude the message we just added
                chat_history.append({
                    'role': 'user' if msg['isUserMessage'] else 'assistant',
                    'content': msg['content']
                })
        
        # Add the new user message to the chat history
        chat_history.append({
            'role': 'user',
            'content': user_message_content
        })
        
        # Get contextual data from vector store
        contextual_data = get_context_for_query(user_message_content, chat['category'])
        
        # Generate AI response
        try:
            ai_response = generate_forum_ai_response(
                user_message_content,
                chat_history,
                chat['category'],
                contextual_data
            )
            
            # Save AI response
            ai_message = storage.create_ai_chat_message({
                'chatId': chat_id,
                'content': ai_response,
                'isUserMessage': False
            })
            
            # Return AI message
            return jsonify(ai_message), 201
            
        except Exception as ai_error:
            print(f"Error generating AI response: {str(ai_error)}")
            return jsonify({
                'message': 'Failed to generate AI response',
                'error': str(ai_error)
            }), 500
        
    except Exception as e:
        print(f"Error in create_message: {str(e)}")
        return jsonify({'message': str(e)}), 500