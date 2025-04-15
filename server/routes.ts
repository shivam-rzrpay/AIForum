import express, { Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";
import session from "express-session";
import { WebSocketServer } from "ws";
import { generateForumAIResponse } from "./awsBedrock";
import { processDocument, getContextForQuery, deleteDocument } from "./chromadb";
import { handleSlackEvent, isBotMentioned, extractQuery } from "./slack";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { createProxyMiddleware } from 'http-proxy-middleware';
import { 
  insertUserSchema, 
  insertPostSchema, 
  insertCommentSchema, 
  insertAiChatSchema, 
  insertAiChatMessageSchema,
  insertDocumentSchema,
  insertVoteSchema
} from "@shared/schema";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage_multer,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Allow only certain file types
    const allowedTypes = ['.pdf', '.docx', '.doc', '.txt', '.md', '.xlsx', '.xls', '.pptx', '.ppt'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only document files are allowed.'));
    }
  }
});

export async function registerRoutes(app: express.Express): Promise<Server> {
  // Set up session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || "xai-forum-secret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
  }));

  // Set up Python backend proxy (port 5001)
  app.use(['/api/python'], createProxyMiddleware({
    target: 'http://localhost:5001',
    changeOrigin: true,
    pathRewrite: {
      '^/api/python': '/api', // Remove the '/python' prefix when forwarding
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err);
      res.status(500).json({ message: 'Python backend service unavailable' });
    }
  }));

  // Authentication middleware
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.session && req.session.userId) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Create HTTP server
  const httpServer = createServer(app);

  // Set up WebSocket server for real-time chat
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws) => {
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'chat_message' && data.userId && data.chatId && data.content) {
          // Save user message to database
          const userMessage = await storage.createAiChatMessage({
            chatId: data.chatId,
            content: data.content,
            isUserMessage: true
          });

          // Get chat information to know the category
          const chat = await storage.getAiChat(data.chatId);
          
          if (!chat) {
            throw new Error("Chat not found");
          }

          // Get previous messages for context
          const previousMessages = await storage.getAiChatMessages(data.chatId);
          const chatHistory = previousMessages.map(msg => ({
            role: msg.isUserMessage ? "user" : "assistant",
            content: msg.content
          }));
          
          // Get contextual data from vector store
          const contextualData = await getContextForQuery(data.content, chat.category);
          
          // Generate AI response
          const aiResponse = await generateForumAIResponse(
            data.content, 
            chatHistory, 
            chat.category,
            contextualData
          );
          
          // Save AI response to database
          const savedAiMessage = await storage.createAiChatMessage({
            chatId: data.chatId,
            content: aiResponse,
            isUserMessage: false
          });
          
          // Send response back to client
          ws.send(JSON.stringify({
            type: 'ai_response',
            chatId: data.chatId,
            message: {
              id: savedAiMessage.id,
              content: aiResponse,
              isUserMessage: false,
              createdAt: savedAiMessage.createdAt
            }
          }));
        }
      } catch (error) {
        console.error('WebSocket error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message
        }));
      }
    });
  });

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      // Set session
      req.session.userId = user.id;
      
      res.status(201).json({
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      // Get user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(400).json({ message: "Invalid username or password" });
      }
      
      // Verify password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(400).json({ message: "Invalid username or password" });
      }
      
      // Set session
      req.session.userId = user.id;
      
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        avatar: user.avatar
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not logged in" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        department: user.department,
        jobTitle: user.jobTitle
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(err => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Forum routes
  app.get("/api/forums/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const { page = "1", limit = "10", sortBy = "recent" } = req.query;
      
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      
      const posts = await storage.getPostsByCategory(
        category as string,
        pageNum,
        limitNum,
        sortBy as string
      );
      
      const total = await storage.countPostsByCategory(category as string);
      
      res.json({
        posts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/forums/:category/posts", isAuthenticated, async (req, res) => {
    try {
      const { category } = req.params;
      const userId = req.session.userId;
      
      const postData = insertPostSchema.parse({
        ...req.body,
        userId,
        category
      });
      
      const post = await storage.createPost(postData);
      
      // Generate AI answer
      try {
        const contextualData = await getContextForQuery(post.title + " " + post.content, category);
        
        const aiResponse = await generateForumAIResponse(
          post.content,
          [{ role: "user", content: post.title + "\n" + post.content }],
          category,
          contextualData
        );
        
        // Save AI response as a comment
        const aiComment = await storage.createComment({
          content: aiResponse,
          postId: post.id,
          userId: 1, // System user ID (create a system user in production)
          isAiGenerated: true
        });
        
        // Update post to mark it as having an AI answer
        await storage.updatePost(post.id, { hasAiAnswer: true });
      } catch (aiError) {
        console.error("Failed to generate AI response:", aiError);
        // Continue anyway - the human response can still be posted
      }
      
      res.status(201).json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid post data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/posts/:postId", async (req, res) => {
    try {
      const { postId } = req.params;
      
      const post = await storage.getPost(parseInt(postId));
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      // Increment view count
      await storage.updatePost(post.id, { views: post.views + 1 });
      
      // Get comments
      const comments = await storage.getCommentsByPostId(post.id);
      
      res.json({
        post: {
          ...post,
          views: post.views + 1
        },
        comments
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/posts/:postId/comments", isAuthenticated, async (req, res) => {
    try {
      const { postId } = req.params;
      const userId = req.session.userId;
      
      const post = await storage.getPost(parseInt(postId));
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      const commentData = insertCommentSchema.parse({
        ...req.body,
        postId: parseInt(postId),
        userId,
        isAiGenerated: false
      });
      
      const comment = await storage.createComment(commentData);
      
      // If this is the first answer, mark the post as answered
      if (!post.isAnswered) {
        await storage.updatePost(post.id, { isAnswered: true });
      }
      
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid comment data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/posts/:postId/votes", isAuthenticated, async (req, res) => {
    try {
      const { postId } = req.params;
      const { voteType } = req.body;
      const userId = req.session.userId;
      
      if (!["upvote", "downvote"].includes(voteType)) {
        return res.status(400).json({ message: "Invalid vote type" });
      }
      
      const post = await storage.getPost(parseInt(postId));
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      // Check for existing vote
      const existingVote = await storage.getVoteByUserAndPost(userId, parseInt(postId));
      
      if (existingVote) {
        if (existingVote.voteType === voteType) {
          // Remove vote if same type
          await storage.deleteVote(existingVote.id);
          res.json({ message: `${voteType} removed` });
        } else {
          // Update vote if different type
          await storage.updateVote(existingVote.id, { voteType });
          res.json({ message: `Changed to ${voteType}` });
        }
      } else {
        // Create new vote
        const voteData = insertVoteSchema.parse({
          postId: parseInt(postId),
          userId,
          voteType
        });
        
        await storage.createVote(voteData);
        res.status(201).json({ message: `${voteType} added` });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid vote data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/comments/:commentId/votes", isAuthenticated, async (req, res) => {
    try {
      const { commentId } = req.params;
      const { voteType } = req.body;
      const userId = req.session.userId;
      
      if (!["upvote", "downvote"].includes(voteType)) {
        return res.status(400).json({ message: "Invalid vote type" });
      }
      
      const comment = await storage.getComment(parseInt(commentId));
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
      
      // Check for existing vote
      const existingVote = await storage.getVoteByUserAndComment(userId, parseInt(commentId));
      
      if (existingVote) {
        if (existingVote.voteType === voteType) {
          // Remove vote if same type
          await storage.deleteVote(existingVote.id);
          
          // Update comment vote counts
          await storage.updateCommentVoteCounts(parseInt(commentId));
          
          res.json({ message: `${voteType} removed` });
        } else {
          // Update vote if different type
          await storage.updateVote(existingVote.id, { voteType });
          
          // Update comment vote counts
          await storage.updateCommentVoteCounts(parseInt(commentId));
          
          res.json({ message: `Changed to ${voteType}` });
        }
      } else {
        // Create new vote
        const voteData = insertVoteSchema.parse({
          commentId: parseInt(commentId),
          userId,
          voteType
        });
        
        await storage.createVote(voteData);
        
        // Update comment vote counts
        await storage.updateCommentVoteCounts(parseInt(commentId));
        
        res.status(201).json({ message: `${voteType} added` });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid vote data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // AI Chat routes
  app.post("/api/ai-chats", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const { category } = req.body;
      
      const chatData = insertAiChatSchema.parse({
        userId,
        category
      });
      
      const chat = await storage.createAiChat(chatData);
      
      res.status(201).json(chat);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid chat data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/ai-chats", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      
      const chats = await storage.getAiChatsByUserId(userId);
      
      res.json(chats);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/ai-chats/:chatId/messages", isAuthenticated, async (req, res) => {
    try {
      const { chatId } = req.params;
      const userId = req.session.userId;
      
      // Ensure user owns the chat
      const chat = await storage.getAiChat(parseInt(chatId));
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      
      if (chat.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to view this chat" });
      }
      
      const messages = await storage.getAiChatMessages(parseInt(chatId));
      
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Document routes
  app.post("/api/documents", isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      const userId = req.session.userId;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: "File is required" });
      }
      
      const { name, description, category, documentType } = req.body;
      
      if (!name || !category || !documentType) {
        return res.status(400).json({ message: "Name, category, and document type are required" });
      }
      
      const documentData = insertDocumentSchema.parse({
        name,
        description,
        fileType: path.extname(file.originalname).slice(1),
        fileSize: file.size,
        category,
        documentType,
        filePath: file.path,
        uploadedById: userId
      });
      
      const document = await storage.createDocument(documentData);
      
      // Process document in the background
      processDocument(file.path, {
        id: document.id,
        name: document.name,
        description: document.description,
        category: document.category,
        documentType: document.documentType
      }, document.category)
        .then(embeddingId => {
          // Update document with embedding ID
          storage.updateDocument(document.id, {
            status: "processed",
            embeddingId
          });
        })
        .catch(error => {
          console.error("Error processing document:", error);
          storage.updateDocument(document.id, {
            status: "failed"
          });
        });
      
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid document data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/documents", isAuthenticated, async (req, res) => {
    try {
      const { category } = req.query;
      
      if (category) {
        const documents = await storage.getDocumentsByCategory(category as string);
        return res.json(documents);
      }
      
      const documents = await storage.getAllDocuments();
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/documents/:documentId", isAuthenticated, async (req, res) => {
    try {
      const { documentId } = req.params;
      const userId = req.session.userId;
      
      const document = await storage.getDocument(parseInt(documentId));
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Check if user uploaded the document or is an admin
      if (document.uploadedById !== userId) {
        // In production, check for admin role here
        return res.status(403).json({ message: "You don't have permission to delete this document" });
      }
      
      // Delete the file
      if (fs.existsSync(document.filePath)) {
        fs.unlinkSync(document.filePath);
      }
      
      // Delete from vector store if processed
      if (document.status === "processed" && document.embeddingId) {
        await deleteDocument(document.embeddingId, document.category);
      }
      
      // Delete from database
      await storage.deleteDocument(document.id);
      
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Slack webhook route
  app.post("/api/slack/webhook", async (req, res) => {
    try {
      const { event, challenge } = req.body;
      
      // Handle Slack verification challenge
      if (challenge) {
        return res.json({ challenge });
      }
      
      if (event && event.type === "message" && !event.bot_id) {
        // Handle the message asynchronously
        if (isBotMentioned(event.text)) {
          res.status(200).end(); // Respond quickly to Slack
          
          // Process the Slack event
          handleSlackEvent(event, async (query, chatHistory, forumCategory) => {
            const contextualData = await getContextForQuery(query, forumCategory);
            return await generateForumAIResponse(query, chatHistory, forumCategory, contextualData);
          });
        }
      }
      
      res.status(200).end();
    } catch (error) {
      console.error("Error handling Slack webhook:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Search route
  app.get("/api/search", async (req, res) => {
    try {
      const { query, category } = req.query;
      
      if (!query) {
        return res.status(400).json({ message: "Query parameter is required" });
      }
      
      let results;
      
      if (category) {
        results = await storage.searchPostsByCategory(query as string, category as string);
      } else {
        results = await storage.searchPosts(query as string);
      }
      
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
