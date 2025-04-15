import boto3
import json
import os
from botocore.exceptions import ClientError
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Initialize Bedrock client
try:
    bedrock_runtime = boto3.client(
        service_name='bedrock-runtime',
        region_name=os.environ.get('AWS_REGION', 'us-east-1')
    )
    logger.info("AWS Bedrock client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize AWS Bedrock client: {str(e)}")
    bedrock_runtime = None

# Claude model ID - using specifically the model you have access to
CLAUDE_MODELS = [
    os.environ.get('CLAUDE_MODEL_ID'),  # Custom model ID if provided in env vars
    "anthropic.claude-3-5-sonnet-20241022-v2:0"  # Your accessible model
]
# Filter out None values and get the first available model
CLAUDE_MODEL_ID = next((model for model in CLAUDE_MODELS if model), "anthropic.claude-3-5-sonnet-20241022-v2:0")
TITAN_EMBEDDING_MODEL_ID = "amazon.titan-embed-text-v2:0"

# Set the region to ap-south-1
os.environ['AWS_REGION'] = os.environ.get('AWS_REGION', 'ap-south-1')

logger.info(f"Using Claude model: {CLAUDE_MODEL_ID}")

def generate_claude_response(messages, system_prompt=None):
    """Generate a response from Claude model
    
    Args:
        messages (list): List of message objects with 'role' and 'content'
        system_prompt (str, optional): System prompt to guide the AI
        
    Returns:
        str: Claude's response text
    """
    if not bedrock_runtime:
        raise Exception("AWS Bedrock client not initialized")
    
    # Format messages for Claude
    formatted_messages = []
    for msg in messages:
        # If content is already a list of content blocks, use it directly
        if isinstance(msg['content'], list):
            formatted_messages.append({
                'role': msg['role'],
                'content': msg['content']
            })
        # If it's a string, convert to a single text content block
        else:
            formatted_messages.append({
                'role': msg['role'],
                'content': [{'type': 'text', 'text': msg['content']}]
            })
    
    # Prepare request body
    request_body = {
        'anthropic_version': 'bedrock-2023-05-31',
        'max_tokens': 2048,
        'messages': formatted_messages
    }
    
    if system_prompt:
        request_body['system'] = system_prompt
    
    try:
        # Make API call to Bedrock
        response = bedrock_runtime.invoke_model(
            modelId=CLAUDE_MODEL_ID, 
            body=json.dumps(request_body)
        )
        
        # Parse response
        response_body = json.loads(response['body'].read().decode('utf-8'))
        return response_body['content'][0]['text']
    
    except ClientError as error:
        logger.error(f"Error calling Claude model: {error}")
        raise Exception(f"Error calling Claude model: {error}")

def generate_forum_ai_response(user_message, chat_history, forum_category, contextual_data=None):
    """Generate a response based on the chat history and forum context
    
    Args:
        user_message (str): The user's message
        chat_history (list): Previous chat history
        forum_category (str): The forum category for context
        contextual_data (str, optional): Optional contextual data from embeddings
        
    Returns:
        str: The AI's response
    """
    # Create system prompt with forum category context
    system_prompt = f"""You are an AI assistant for the X-AI Forum, specializing in the "{forum_category}" category.
Your goal is to provide helpful, accurate, and concise responses to user queries.
Be polite, professional, and avoid speculating when you don't know something.
"""

    # Add contextual data to system prompt if available
    if contextual_data:
        system_prompt += f"\nUse the following contextual information from our knowledge base when relevant to answer the query:\n{contextual_data}"
    
    try:
        return generate_claude_response(chat_history, system_prompt)
    except Exception as e:
        logger.error(f"Error generating forum AI response: {str(e)}")
        raise Exception(f"Error generating AI response: {str(e)}")

def create_titan_embedding(text):
    """Create embedding using Amazon Titan Embeddings model
    
    Args:
        text (str): Text to create embeddings for
        
    Returns:
        list: Embedding vector
    """
    if not bedrock_runtime:
        raise Exception("AWS Bedrock client not initialized")
    
    # Prepare request body
    request_body = {
        'inputText': text
    }
    
    try:
        # Make API call to Bedrock
        response = bedrock_runtime.invoke_model(
            modelId=TITAN_EMBEDDING_MODEL_ID, 
            body=json.dumps(request_body)
        )
        
        # Parse response
        response_body = json.loads(response['body'].read().decode('utf-8'))
        return response_body['embedding']
    
    except ClientError as error:
        logger.error(f"Error creating embedding: {error}")
        raise Exception(f"Error creating embedding: {error}")