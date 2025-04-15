from flask import Blueprint, request, jsonify, session
import bcrypt
from ..models.storage import storage

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['username', 'email', 'password', 'name']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'message': f'{field} is required'}), 400
        
        # Check if username already exists
        existing_user = storage.get_user_by_username(data['username'])
        if existing_user:
            return jsonify({'message': 'Username already exists'}), 400
        
        # Check if email already exists
        existing_email = storage.get_user_by_email(data['email'])
        if existing_email:
            return jsonify({'message': 'Email already exists'}), 400
        
        # Hash password
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Create user
        user_data = {
            'username': data['username'],
            'email': data['email'],
            'name': data['name'],
            'password': hashed_password
        }
        
        # Add optional fields if present
        if 'avatar' in data:
            user_data['avatar'] = data['avatar']
        if 'department' in data:
            user_data['department'] = data['department']
        if 'jobTitle' in data:
            user_data['jobTitle'] = data['jobTitle']
        
        # Save user
        user = storage.create_user(user_data)
        
        # Set session
        session['user_id'] = user['id']
        
        # Return user data (without password)
        return jsonify({
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'name': user['name'],
            'avatar': user.get('avatar')
        }), 201
        
    except Exception as e:
        print(f"Error in register: {str(e)}")
        return jsonify({'message': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        # Validate required fields
        if 'username' not in data or 'password' not in data:
            return jsonify({'message': 'Username and password are required'}), 400
        
        # Get user
        user = storage.get_user_by_username(data['username'])
        if not user:
            return jsonify({'message': 'Invalid username or password'}), 400
        
        # Verify password
        if not bcrypt.checkpw(data['password'].encode('utf-8'), user['password'].encode('utf-8')):
            return jsonify({'message': 'Invalid username or password'}), 400
        
        # Set session
        session['user_id'] = user['id']
        
        # Return user data (without password)
        return jsonify({
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'name': user['name'],
            'avatar': user.get('avatar'),
            'department': user.get('department'),
            'jobTitle': user.get('jobTitle')
        }), 200
        
    except Exception as e:
        print(f"Error in login: {str(e)}")
        return jsonify({'message': str(e)}), 500

@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    try:
        # Check if user is authenticated
        if 'user_id' not in session:
            return jsonify({'message': 'Not logged in'}), 401
        
        # Get user
        user = storage.get_user(session['user_id'])
        if not user:
            # Clear invalid session
            session.clear()
            return jsonify({'message': 'User not found'}), 404
        
        # Return user data (without password)
        return jsonify({
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'name': user['name'],
            'avatar': user.get('avatar'),
            'department': user.get('department'),
            'jobTitle': user.get('jobTitle')
        }), 200
        
    except Exception as e:
        print(f"Error in get_current_user: {str(e)}")
        return jsonify({'message': str(e)}), 500

@auth_bp.route('/logout', methods=['POST'])
def logout():
    try:
        # Clear session
        session.clear()
        return jsonify({'message': 'Logged out successfully'}), 200
        
    except Exception as e:
        print(f"Error in logout: {str(e)}")
        return jsonify({'message': str(e)}), 500