"""
Slack integration service for X-AI Forum.
Handles posting forum content to Slack and responding to Slack messages.
"""
import os
import logging
import re
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

logger = logging.getLogger('slack-service')

class SlackService:
    def __init__(self):
        """Initialize Slack service with bot token."""
        self.token = os.environ.get('SLACK_BOT_TOKEN')
        self.channel_id = os.environ.get('SLACK_CHANNEL_ID')
        self.client = None
        
        if self.token:
            self.client = WebClient(token=self.token)
            logger.info("Slack client initialized")
        else:
            logger.warning("Slack token not found, service will be unavailable")
    
    def send_message(self, text, channel=None, thread_ts=None):
        """
        Send a message to a Slack channel.
        
        Args:
            text: Message text
            channel: Channel ID (defaults to SLACK_CHANNEL_ID)
            thread_ts: Thread timestamp for replies
            
        Returns:
            Message timestamp if successful, None otherwise
        """
        if not self.client:
            logger.error("Slack client not initialized")
            return None
        
        try:
            # Use provided channel or default
            target_channel = channel or self.channel_id
            if not target_channel:
                logger.error("No Slack channel specified")
                return None
            
            # Prepare message payload
            payload = {
                "channel": target_channel,
                "text": text
            }
            
            # Add thread_ts if replying in a thread
            if thread_ts:
                payload["thread_ts"] = thread_ts
            
            # Send message
            response = self.client.chat_postMessage(**payload)
            
            logger.info(f"Message sent to Slack channel {target_channel}")
            return response.get('ts')
            
        except SlackApiError as e:
            logger.error(f"Slack API error: {e.response['error']}")
            return None
        except Exception as e:
            logger.error(f"Error sending Slack message: {str(e)}")
            return None
    
    def send_forum_post(self, post, category):
        """
        Share a forum post to Slack.
        
        Args:
            post: Forum post object with title, content, etc.
            category: Forum category name
            
        Returns:
            Message timestamp if successful, None otherwise
        """
        if not self.client:
            logger.error("Slack client not initialized")
            return None
        
        try:
            # Format message with post details
            message = f"*New post in {category}*: {post.get('title', 'Untitled')}\n\n"
            message += post.get('content', '(No content)')
            message += f"\n\nPosted by: {post.get('user', {}).get('name', 'Anonymous')}"
            
            # Send to default channel
            return self.send_message(message)
            
        except Exception as e:
            logger.error(f"Error sharing forum post to Slack: {str(e)}")
            return None
    
    def is_bot_mentioned(self, text):
        """
        Check if the bot is mentioned in the message.
        
        Args:
            text: Message text
            
        Returns:
            Boolean indicating if bot is mentioned
        """
        # Look for common bot mention patterns
        patterns = [
            r"<@.*>",  # Direct mention
            r"@x-ai",   # Name mention
            r"@X-AI",
            r"x-ai\s+forum",
            r"X-AI\s+Forum",
            r"xai\s+forum"
        ]
        
        for pattern in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return True
                
        return False
    
    def extract_query(self, text):
        """
        Extract the actual query from a message that mentions the bot.
        
        Args:
            text: Message text
            
        Returns:
            The extracted query
        """
        # Remove mention patterns to get the actual query
        patterns = [
            r"<@.*>",
            r"@x-ai",
            r"@X-AI",
            r"x-ai\s+forum",
            r"X-AI\s+Forum",
            r"xai\s+forum"
        ]
        
        query = text
        for pattern in patterns:
            query = re.sub(pattern, "", query, flags=re.IGNORECASE)
        
        # Clean up whitespace
        query = query.strip()
        
        return query
    
    def handle_slack_event(self, event, generate_ai_response):
        """
        Handle an incoming Slack event.
        
        Args:
            event: Slack event object
            generate_ai_response: Function to generate AI response
            
        Returns:
            Boolean indicating success
        """
        if not self.client:
            logger.error("Slack client not initialized")
            return False
        
        try:
            # Check if this is a message event
            if event.get('type') != 'message':
                return False
            
            # Get message text and channel
            text = event.get('text', '')
            channel = event.get('channel')
            thread_ts = event.get('thread_ts') or event.get('ts')
            
            # Check if bot is mentioned
            if not self.is_bot_mentioned(text):
                return False
            
            # Extract query
            query = self.extract_query(text)
            if not query:
                return False
            
            # Generate AI response
            # Default to 'general' category for Slack queries
            ai_response = generate_ai_response(query, [], 'general')
            
            # Send response back to Slack
            self.send_message(ai_response, channel, thread_ts)
            
            return True
            
        except Exception as e:
            logger.error(f"Error handling Slack event: {str(e)}")
            return False

# Create singleton instance
slack_service = SlackService()