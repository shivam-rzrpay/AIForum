import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

// AWS Bedrock client setup
const REGION = process.env.AWS_REGION || "ap-south-1";
// Try a different Claude model that might be accessible
const MODEL_ID = "anthropic.claude-3-sonnet-20240229-v1:0";

// Create a client with credentials from environment variables
const bedrockClient = new BedrockRuntimeClient({ 
  region: REGION,
  // Use environment variables without fallbacks 
  // (the application should fail appropriately if credentials aren't provided)
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    sessionToken: process.env.AWS_SESSION_TOKEN
  }
});

interface MessageContent {
  type: string;
  text?: string;
}

interface Message {
  role: string;
  content: MessageContent[];
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
    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 4096,
      messages: messages,
      temperature: 0.3,
      top_p: 0.9,
    };

    if (systemPrompt) {
      Object.assign(payload, { system: systemPrompt });
    }

    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload),
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return responseBody.content[0].text;
  } catch (error: any) {
    console.error("Error generating Claude response:", error);
    throw new Error(`Failed to generate AI response: ${error.message || "Unknown error"}`);
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
  chatHistory: { role: string; content: string }[],
  forumCategory: string,
  contextualData?: string
): Promise<string> {
  // Convert chat history to the format expected by Claude
  const formattedMessages: Message[] = chatHistory.map(msg => ({
    role: msg.role,
    content: [{ type: "text", text: msg.content }]
  }));

  // Add the new user message
  formattedMessages.push({
    role: "user",
    content: [{ type: "text", text: userMessage }]
  });

  // Create a system prompt based on forum category and contextual data
  let systemPrompt = `You are a helpful AI assistant for the X-AI-Forum specifically focused on the ${forumCategory} category. 
  Provide accurate, concise, and helpful information. Use a professional and friendly tone.`;

  if (contextualData) {
    systemPrompt += `\n\nHere is some relevant context to help with your response:\n${contextualData}`;
  }

  // Additional category-specific instructions
  switch (forumCategory) {
    case "technical":
      systemPrompt += "\n\nWhen answering technical questions, provide code examples when appropriate and refer to documentation. Be precise and detailed.";
      break;
    case "ideas":
      systemPrompt += "\n\nWhen discussing product ideas, be constructive and encouraging. Suggest improvements or considerations while remaining positive.";
      break;
    case "general":
      systemPrompt += "\n\nFor general queries, provide comprehensive information about the organization, processes, and procedures as needed.";
      break;
    case "hr":
      systemPrompt += "\n\nFor HR and onboarding questions, be informative about policies, benefits, and procedures. Maintain confidentiality and refer to HR when appropriate for sensitive matters.";
      break;
  }

  return await generateClaudeResponse(formattedMessages, systemPrompt);
}

/**
 * Create embedding using Amazon Titan Embeddings model
 * @param text Text to create embeddings for
 * @returns Promise with the embedding vector
 */
export async function createTitanEmbedding(text: string): Promise<number[]> {
  try {
    const payload = {
      inputText: text,
    };

    const command = new InvokeModelCommand({
      modelId: "amazon.titan-embed-text-v2:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload),
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return responseBody.embedding;
  } catch (error: any) {
    console.error("Error creating Titan embedding:", error);
    throw new Error(`Failed to create embedding: ${error.message || "Unknown error"}`);
  }
}
