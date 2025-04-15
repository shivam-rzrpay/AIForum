import os
import logging
import re
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

# Configure logging
logger = logging.getLogger(__name__)

# Initialize Slack client
try:
    slack_token = os.environ.get('SLACK_BOT_TOKEN')
    if slack_token:
        slack_client = WebClient(token=slack_token)
        logger.info("Slack client initialized successfully")
    else:
        logger.warning("SLACK_BOT_TOKEN not found - Slack integration disabled")
        slack_client = None
except Exception as e:
    logger.error(f"Failed to initialize Slack client: {str(e)}")
    slack_client = None

def send_slack_message(channel, text, thread_ts=None):
    """Send a response to a query in Slack
    
    Args:
        channel (str): The Slack channel ID
        text (str): The text to send
        thread_ts (str, optional): Optional thread timestamp to reply in a thread
        
    Returns:
        dict: The sent message details
    """
    if not slack_client:
        logger.warning("Slack client not available - message not sent")
        return None
    
    try:
        # Prepare message payload
        message_payload = {
            "channel": channel,
            "text": text
        }
        
        # If thread_ts is provided, add it to payload to reply in thread
        if thread_ts:
            message_payload["thread_ts"] = thread_ts
        
        # Send message
        response = slack_client.chat_postMessage(**message_payload)
        
        return {
            "ts": response["ts"],
            "channel": response["channel"]
        }
    
    except SlackApiError as e:
        logger.error(f"Error sending Slack message: {e}")
        return None

def is_bot_mentioned(text):
    """Check if a message mentions the X-AI-Forum bot
    
    Args:
        text (str): Message text
        
    Returns:
        bool: Indicating if bot is mentioned
    """
    # Check for direct mentions with @X-AI-Forum
    if re.search(r'<@[A-Z0-9]+>\s*x-ai-forum', text.lower()):
        return True
    
    # Check for plain text mentions
    keywords = ['x-ai-forum', 'xai forum', 'xai-forum', 'ai forum bot']
    for keyword in keywords:
        if keyword in text.lower():
            return True
    
    return False

def extract_query(text):
    """Extract the query from a message that mentions the bot
    
    Args:
        text (str): Message text
        
    Returns:
        str: The extracted query
    """
    # Remove bot mentions
    query = re.sub(r'<@[A-Z0-9]+>\s*x-ai-forum', '', text, flags=re.IGNORECASE)
    query = re.sub(r'x-ai-forum|xai forum|xai-forum|ai forum bot', '', query, flags=re.IGNORECASE)
    
    # Clean up and trim
    query = query.strip()
    
    return query

def handle_slack_event(event, generate_ai_response):
    """Handle an incoming Slack event
    
    Args:
        event (dict): The Slack event object
        generate_ai_response (function): Function to generate AI response
    """
    if not slack_client:
        logger.warning("Slack client not available - event not handled")
        return
    
    try:
        # Check if it's a message event and not from a bot
        if event.get('type') == 'message' and not event.get('bot_id'):
            text = event.get('text', '')
            channel = event.get('channel')
            thread_ts = event.get('thread_ts', event.get('ts'))
            
            # Check if the bot is mentioned
            if is_bot_mentioned(text):
                # Extract the query
                query = extract_query(text)
                
                if query:
                    # Send typing indicator
                    try:
                        slack_client.reactions_add(
                            channel=channel,
                            timestamp=thread_ts,
                            name="hourglass_flowing_sand"
                        )
                    except:
                        pass
                    
                    # Generate AI response
                    try:
                        # Default to general_queries category
                        response = generate_ai_response(
                            query,
                            [{"role": "user", "content": query}],
                            "general_queries"
                        )
                        
                        # Send response
                        send_slack_message(channel, response, thread_ts)
                        
                        # Remove typing indicator
                        try:
                            slack_client.reactions_remove(
                                channel=channel,
                                timestamp=thread_ts,
                                name="hourglass_flowing_sand"
                            )
                        except:
                            pass
                        
                    except Exception as e:
                        logger.error(f"Error generating AI response for Slack: {str(e)}")
                        send_slack_message(
                            channel,
                            "I'm sorry, I couldn't generate a response. Please try again later.",
                            thread_ts
                        )
    
    except Exception as e:
        logger.error(f"Error handling Slack event: {str(e)}")