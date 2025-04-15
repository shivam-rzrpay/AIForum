import { WebClient } from "@slack/web-api";

if (!process.env.SLACK_BOT_TOKEN) {
  console.warn("SLACK_BOT_TOKEN environment variable is not set. Slack integration will not work.");
}

// Initialize Slack Web Client
const slack = new WebClient(process.env.SLACK_BOT_TOKEN || "");

/**
 * Send a response to a query in Slack
 * @param channel The Slack channel ID
 * @param text The text to send
 * @param threadTs Optional thread timestamp to reply in a thread
 * @returns Promise with the sent message details
 */
export async function sendSlackMessage(channel: string, text: string, threadTs?: string) {
  try {
    if (!process.env.SLACK_BOT_TOKEN) {
      throw new Error("SLACK_BOT_TOKEN environment variable is not set");
    }
    
    const result = await slack.chat.postMessage({
      channel,
      text,
      thread_ts: threadTs,
    });
    
    return result;
  } catch (error) {
    console.error("Error sending Slack message:", error);
    throw new Error(`Failed to send Slack message: ${error.message}`);
  }
}

/**
 * Check if a message mentions the X-AI-Forum bot
 * @param text Message text
 * @returns Boolean indicating if bot is mentioned
 */
export function isBotMentioned(text: string): boolean {
  return text.includes("@X-AI-Forum");
}

/**
 * Extract the query from a message that mentions the bot
 * @param text Message text
 * @returns The extracted query
 */
export function extractQuery(text: string): string {
  // Remove the bot mention and return the rest of the message
  return text.replace(/@X-AI-Forum/g, "").trim();
}

/**
 * Handle an incoming Slack event
 * @param event The Slack event object
 * @param generateAIResponse Function to generate AI response
 */
export async function handleSlackEvent(event: any, generateAIResponse: Function) {
  try {
    // Check if this is a message event and not from a bot
    if (event.type === "message" && !event.bot_id && event.text) {
      // Check if the bot is mentioned
      if (isBotMentioned(event.text)) {
        const query = extractQuery(event.text);
        const channel = event.channel;
        const threadTs = event.thread_ts || event.ts;
        
        // Send a temporary message indicating processing
        await sendSlackMessage(channel, "Processing your query...", threadTs);
        
        // Generate AI response (determine forum category from context if possible)
        let forumCategory = "general"; // Default category
        
        // Try to determine category from channel name or message context
        if (event.channel_name) {
          if (event.channel_name.includes("tech") || event.channel_name.includes("dev") || event.channel_name.includes("engineering")) {
            forumCategory = "technical";
          } else if (event.channel_name.includes("idea") || event.channel_name.includes("product") || event.channel_name.includes("feature")) {
            forumCategory = "ideas";
          } else if (event.channel_name.includes("hr") || event.channel_name.includes("people") || event.channel_name.includes("onboarding")) {
            forumCategory = "hr";
          }
        }
        
        // Generate the AI response
        const response = await generateAIResponse(query, [], forumCategory);
        
        // Send the AI response
        await sendSlackMessage(channel, response, threadTs);
      }
    }
  } catch (error) {
    console.error("Error handling Slack event:", error);
  }
}
