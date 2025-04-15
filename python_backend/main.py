from app import create_app
import os

app = create_app()

if __name__ == '__main__':
    # Get port from environment variable or default to 5000
    port = int(os.environ.get('PORT', 5000))
    
    # Run with host='0.0.0.0' to make the app accessible externally
    app.run(host='0.0.0.0', port=port, debug=True)