"""
AWS Bedrock service for AI functionality.
Uses Claude 3.5 Sonnet for text generation and Titan for embeddings.
"""
import os
import json
import logging
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger('bedrock-service')

# AWS Bedrock models and region
# Use only the models you have access to
CLAUDE_MODELS = [
    os.environ.get('CLAUDE_MODEL_ID'),  # Custom model ID if provided in env vars
    "anthropic.claude-3-5-sonnet-20241022-v2:0"  # Your accessible model
]
# Filter out None values and get the first available model
CLAUDE_MODEL = next((model for model in CLAUDE_MODELS if model), "anthropic.claude-3-5-sonnet-20241022-v2:0")
TITAN_EMBEDDING_MODEL = "amazon.titan-embed-text-v2:0"
AWS_REGION = os.environ.get("AWS_REGION", "ap-south-1")  # Mumbai region as specified

logger.info(f"Using Claude model: {CLAUDE_MODEL}")

class BedrockService:
    def __init__(self, region=AWS_REGION):
        """Initialize Bedrock service with AWS credentials."""
        # Credentials are loaded from environment variables
        self.region = region
        self.client = None
        self.initialize_client()

    def initialize_client(self):
        """Initialize AWS Bedrock client with credentials."""
        try:
            # Credentials loaded from AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN
            self.client = boto3.client(
                service_name='bedrock-runtime',
                region_name=self.region
            )
            logger.info(f"AWS Bedrock client initialized for region {self.region}")
        except Exception as e:
            logger.error(f"Failed to initialize AWS Bedrock client: {str(e)}")
            raise

    def generate_ai_response(self, query, chat_history, category, contextual_data=None):
        """
        Generate AI response using Claude model.

        Args:
            query: User query text
            chat_history: Previous conversation messages
            category: Forum category for context
            contextual_data: Optional data from document embeddings

        Returns:
            AI-generated response text
        """
        if not self.client:
            logger.error("AWS Bedrock client not initialized")
            return "Error: AWS Bedrock service unavailable"

        try:
            # Build system prompt
            system_prompt = f"You are an AI assistant for the X-AI Forum in the {category} category. "
            system_prompt += "Your responses should be helpful, accurate, and concise. "

            if contextual_data:
                system_prompt += f"\n\nRelevant context information: {contextual_data}"

            # Build message history in Claude format
            messages = []

            # Add chat history
            for msg in chat_history:
                role = msg.get('role', '')
                content = msg.get('content', '')

                if role == 'user':
                    messages.append({"role": "user", "content": content})
                elif role == 'assistant':
                    messages.append({"role": "assistant", "content": content})

            # Add the current query
            messages.append({"role": "user", "content": query})

            # Build Claude request payload
            payload = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1000,
                "messages": messages,
                "system": system_prompt,
                "temperature": 0.7
            }

            # Send request to Bedrock
            response = self.client.invoke_model(
                modelId=CLAUDE_MODEL,
                body=json.dumps(payload)
            )

            # Parse response
            response_body = json.loads(response['body'].read().decode('utf-8'))

            # Extract the response content
            ai_response = response_body.get('content', [{}])[0].get('text', '')

            logger.info(f"Generated AI response for query: {query[:50]}...")
            return ai_response

        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            error_message = e.response.get('Error', {}).get('Message', str(e))
            logger.error(f"AWS Bedrock error ({error_code}): {error_message}")
            return f"Error generating response: {error_message}"
        except Exception as e:
            logger.error(f"Error generating AI response: {str(e)}")
            return f"Error generating response: {str(e)}"

    def create_embedding(self, text):
        """
        Create embedding vector using Titan model.

        Args:
            text: Text to create embedding for

        Returns:
            Embedding vector (list of floats)
        """
        if not self.client:
            logger.error("AWS Bedrock client not initialized")
            return []

        try:
            # Build Titan embedding request payload
            payload = {
                "inputText": text,
                "embeddingConfig": {
                    "outputEmbeddingLength": 1536  # Standard embedding length
                }
            }

            # Send request to Bedrock
            response = self.client.invoke_model(
                modelId=TITAN_EMBEDDING_MODEL,
                body=json.dumps(payload)
            )

            # Parse response
            response_body = json.loads(response['body'].read().decode('utf-8'))

            # Extract embedding vector
            embedding = response_body.get('embedding', [])

            logger.info(f"Created embedding for text: {text[:50]}...")
            return embedding

        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            error_message = e.response.get('Error', {}).get('Message', str(e))
            logger.error(f"AWS Bedrock error ({error_code}): {error_message}")
            return []
        except Exception as e:
            logger.error(f"Error creating embedding: {str(e)}")
            return []

# Create singleton instance
bedrock_service = BedrockService()