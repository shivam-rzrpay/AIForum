from flask import Flask
import os
from flask_cors import CORS
from flask_session import Session
from werkzeug.middleware.proxy_fix import ProxyFix

def create_app():
    """Create and configure Flask application"""
    # Create Flask app
    app = Flask(__name__)
    
    # Configure app
    app.config.update(
        SECRET_KEY=os.environ.get('SESSION_SECRET', 'xai-forum-secret'),
        SESSION_TYPE='filesystem',
        SESSION_PERMANENT=False,
        SESSION_USE_SIGNER=True,
        SESSION_COOKIE_SECURE=os.environ.get('FLASK_ENV') == 'production',
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE='Lax'
    )
    
    # Set up sessions
    Session(app)
    
    # Enable CORS for all routes
    CORS(app, supports_credentials=True)
    
    # Fix for proxy headers
    app.wsgi_app = ProxyFix(app.wsgi_app)
    
    # Register routes
    with app.app_context():
        # Initialize services
        from .services import chromadb_service
        chromadb_service.initialize_collections()
        
        # Register blueprints
        from .routes.auth import auth_bp
        from .routes.forum import forum_bp
        from .routes.chat import chat_bp
        from .routes.documents import documents_bp
        
        app.register_blueprint(auth_bp, url_prefix='/api/auth')
        app.register_blueprint(forum_bp, url_prefix='/api/forums')
        app.register_blueprint(chat_bp, url_prefix='/api/ai-chats')
        app.register_blueprint(documents_bp, url_prefix='/api/documents')
        
        # Health check route
        @app.route('/health')
        def health_check():
            return {'status': 'healthy'}, 200
    
    return app