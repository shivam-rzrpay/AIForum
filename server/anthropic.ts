import Anthropic from '@anthropic-ai/sdk';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const MODEL = 'claude-3-7-sonnet-20250219';

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface MessageContent {
  type: string;
  text?: string;
}

interface Message {
  role: string;
  content: MessageContent[] | string;
}

/**
 * Generate a response from Claude model
 * @param messages Array of message objects to send to the model
 * @param systemPrompt Optional system prompt to guide the AI
 * @returns Promise with the model's response
 */
export async function generateClaudeResponse(
  messages: Message[],
  systemPrompt?: string
): Promise<string> {
  try {
    // Format messages for Anthropic API if they're using string content
    const formattedMessages = messages.map(msg => {
      if (typeof msg.content === 'string') {
        return {
          role: msg.role,
          content: [{ type: 'text', text: msg.content }]
        };
      }
      return msg;
    });

    const response = await anthropic.messages.create({
      model: MODEL,
      system: systemPrompt,
      max_tokens: 1024,
      messages: formattedMessages as any, // Type assertion for compatibility
    });

    // Access the text from the content
    if (response.content && response.content.length > 0 && 'text' in response.content[0]) {
      return response.content[0].text;
    }
    return "I'm sorry, I couldn't generate a proper response at this time.";
  } catch (error) {
    console.error('Error generating Claude response:', error);
    throw new Error(`Failed to generate response: ${error.message}`);
  }
}

/**
 * Generate a response based on the chat history and forum context
 * @param userMessage The user's message
 * @param chatHistory Previous chat history
 * @param forumCategory The forum category for context
 * @param contextualData Optional contextual data from embeddings
 * @returns Promise with the AI's response
 */
export async function generateForumAIResponse(
  userMessage: string,
  chatHistory: Message[],
  forumCategory: string,
  contextualData?: string
): Promise<string> {
  // Create system prompt with context
  let systemPrompt = `You are an AI assistant for the X-AI Forum platform, specializing in the "${forumCategory}" category.
Your task is to provide helpful, accurate, and concise responses to user questions.`;

  // Add contextual data if available
  if (contextualData) {
    systemPrompt += `\n\nUse the following information to help answer the query:\n${contextualData}`;
  }

  // Add the current message to the chat history
  const messages = [
    ...chatHistory,
    { role: 'user', content: userMessage }
  ];

  // Generate response
  return generateClaudeResponse(messages, systemPrompt);
}