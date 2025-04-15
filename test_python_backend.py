"""
Simple test script to verify the Python backend is functioning correctly.
"""
import requests
import json
import logging
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger('test-python-backend')

def test_health_endpoint():
    """Test the health endpoint."""
    try:
        response = requests.get("http://localhost:5001/health")
        response.raise_for_status()
        data = response.json()
        
        logger.info(f"Health check status: {data.get('status')}")
        logger.info(f"Services status:")
        for service, status in data.get('services', {}).items():
            logger.info(f"  - {service}: {status}")
        
        return True
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return False

def test_ai_chat():
    """Test the AI chat endpoint."""
    try:
        # Create a new chat
        chat_data = {
            "userId": 1,
            "category": "general"
        }
        
        chat_response = requests.post(
            "http://localhost:5001/api/ai-chats",
            json=chat_data
        )
        chat_response.raise_for_status()
        chat = chat_response.json()
        chat_id = chat.get('id')
        
        logger.info(f"Created chat with ID: {chat_id}")
        
        # Send a test message
        message_data = {
            "content": "Tell me about X-AI Forum platform",
            "category": "general"
        }
        
        message_response = requests.post(
            f"http://localhost:5001/api/ai-chats/{chat_id}/messages",
            json=message_data
        )
        message_response.raise_for_status()
        message = message_response.json()
        
        logger.info(f"Successfully sent message and received response")
        logger.info(f"AI Response: {message.get('content')[:100]}...")
        
        return True
    except Exception as e:
        logger.error(f"AI chat test failed: {str(e)}")
        return False

if __name__ == "__main__":
    logger.info("Testing Python backend...")
    
    if test_health_endpoint():
        logger.info("Health check successful")
    else:
        logger.error("Health check failed")
    
    if test_ai_chat():
        logger.info("AI chat test successful")
    else:
        logger.error("AI chat test failed")
