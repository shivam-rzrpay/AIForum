import { 
  users, type User, type InsertUser,
  posts, type Post, type InsertPost,
  comments, type Comment, type InsertComment,
  aiChats, type AiChat, type InsertAiChat,
  aiChatMessages, type AiChatMessage, type InsertAiChatMessage,
  documents, type Document, type InsertDocument,
  votes, type Vote, type InsertVote
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Post operations
  createPost(post: InsertPost): Promise<Post>;
  getPost(id: number): Promise<Post | undefined>;
  updatePost(id: number, data: Partial<Post>): Promise<Post | undefined>;
  getPostsByCategory(category: string, page: number, limit: number, sortBy: string): Promise<Post[]>;
  countPostsByCategory(category: string): Promise<number>;
  searchPosts(query: string): Promise<Post[]>;
  searchPostsByCategory(query: string, category: string): Promise<Post[]>;
  
  // Comment operations
  createComment(comment: InsertComment): Promise<Comment>;
  getComment(id: number): Promise<Comment | undefined>;
  getCommentsByPostId(postId: number): Promise<Comment[]>;
  updateCommentVoteCounts(id: number): Promise<void>;
  
  // AI Chat operations
  createAiChat(chat: InsertAiChat): Promise<AiChat>;
  getAiChat(id: number): Promise<AiChat | undefined>;
  getAiChatsByUserId(userId: number): Promise<AiChat[]>;
  
  // AI Chat Message operations
  createAiChatMessage(message: InsertAiChatMessage): Promise<AiChatMessage>;
  getAiChatMessages(chatId: number): Promise<AiChatMessage[]>;
  
  // Document operations
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: number): Promise<Document | undefined>;
  updateDocument(id: number, data: Partial<Document>): Promise<Document | undefined>;
  getDocumentsByCategory(category: string): Promise<Document[]>;
  getAllDocuments(): Promise<Document[]>;
  deleteDocument(id: number): Promise<void>;
  
  // Vote operations
  createVote(vote: InsertVote): Promise<Vote>;
  getVoteByUserAndPost(userId: number, postId: number): Promise<Vote | undefined>;
  getVoteByUserAndComment(userId: number, commentId: number): Promise<Vote | undefined>;
  updateVote(id: number, data: Partial<Vote>): Promise<Vote | undefined>;
  deleteVote(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private posts: Map<number, Post>;
  private comments: Map<number, Comment>;
  private aiChats: Map<number, AiChat>;
  private aiChatMessages: Map<number, AiChatMessage>;
  private documents: Map<number, Document>;
  private votes: Map<number, Vote>;
  
  private userIdCounter: number;
  private postIdCounter: number;
  private commentIdCounter: number;
  private aiChatIdCounter: number;
  private aiChatMessageIdCounter: number;
  private documentIdCounter: number;
  private voteIdCounter: number;

  constructor() {
    this.users = new Map();
    this.posts = new Map();
    this.comments = new Map();
    this.aiChats = new Map();
    this.aiChatMessages = new Map();
    this.documents = new Map();
    this.votes = new Map();
    
    this.userIdCounter = 1;
    this.postIdCounter = 1;
    this.commentIdCounter = 1;
    this.aiChatIdCounter = 1;
    this.aiChatMessageIdCounter = 1;
    this.documentIdCounter = 1;
    this.voteIdCounter = 1;
    
    // Create a system user for AI responses
    this.createUser({
      username: "system_ai",
      password: "password_not_used_for_system",
      email: "ai@system.com",
      name: "AI Assistant",
      avatar: "",
      department: "System",
      jobTitle: "AI Assistant"
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const createdAt = new Date();
    const user: User = { ...insertUser, id, createdAt };
    this.users.set(id, user);
    return user;
  }

  // Post operations
  async createPost(insertPost: InsertPost): Promise<Post> {
    const id = this.postIdCounter++;
    const createdAt = new Date();
    const post: Post = { 
      ...insertPost, 
      id, 
      createdAt, 
      updatedAt: createdAt,
      views: 0,
      isAnswered: false,
      hasAiAnswer: false
    };
    this.posts.set(id, post);
    return post;
  }

  async getPost(id: number): Promise<Post | undefined> {
    return this.posts.get(id);
  }

  async updatePost(id: number, data: Partial<Post>): Promise<Post | undefined> {
    const post = this.posts.get(id);
    if (!post) return undefined;
    
    const updatedPost = { ...post, ...data, updatedAt: new Date() };
    this.posts.set(id, updatedPost);
    return updatedPost;
  }

  async getPostsByCategory(category: string, page: number, limit: number, sortBy: string): Promise<Post[]> {
    const posts = Array.from(this.posts.values())
      .filter(post => post.category === category);
    
    // Sort posts based on sortBy parameter
    if (sortBy === "recent") {
      posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } else if (sortBy === "popular") {
      posts.sort((a, b) => b.views - a.views);
    } else if (sortBy === "answered") {
      posts.sort((a, b) => {
        if (a.isAnswered === b.isAnswered) {
          return b.createdAt.getTime() - a.createdAt.getTime();
        }
        return a.isAnswered ? -1 : 1;
      });
    }
    
    // Paginate
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    return posts.slice(startIndex, endIndex);
  }

  async countPostsByCategory(category: string): Promise<number> {
    return Array.from(this.posts.values())
      .filter(post => post.category === category).length;
  }

  async searchPosts(query: string): Promise<Post[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.posts.values())
      .filter(post => 
        post.title.toLowerCase().includes(lowercaseQuery) || 
        post.content.toLowerCase().includes(lowercaseQuery)
      );
  }

  async searchPostsByCategory(query: string, category: string): Promise<Post[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.posts.values())
      .filter(post => 
        post.category === category && 
        (post.title.toLowerCase().includes(lowercaseQuery) || 
         post.content.toLowerCase().includes(lowercaseQuery))
      );
  }

  // Comment operations
  async createComment(insertComment: InsertComment): Promise<Comment> {
    const id = this.commentIdCounter++;
    const createdAt = new Date();
    const comment: Comment = { 
      ...insertComment, 
      id, 
      createdAt,
      upvotes: 0,
      downvotes: 0
    };
    this.comments.set(id, comment);
    return comment;
  }

  async getComment(id: number): Promise<Comment | undefined> {
    return this.comments.get(id);
  }

  async getCommentsByPostId(postId: number): Promise<Comment[]> {
    return Array.from(this.comments.values())
      .filter(comment => comment.postId === postId)
      .sort((a, b) => {
        // Show AI-generated comments first, then by upvotes
        if (a.isAiGenerated !== b.isAiGenerated) {
          return a.isAiGenerated ? -1 : 1;
        }
        
        const aScore = a.upvotes - a.downvotes;
        const bScore = b.upvotes - b.downvotes;
        
        if (aScore !== bScore) {
          return bScore - aScore;
        }
        
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }

  async updateCommentVoteCounts(id: number): Promise<void> {
    const comment = this.comments.get(id);
    if (!comment) return;
    
    const votes = Array.from(this.votes.values())
      .filter(vote => vote.commentId === id);
    
    const upvotes = votes.filter(vote => vote.voteType === "upvote").length;
    const downvotes = votes.filter(vote => vote.voteType === "downvote").length;
    
    this.comments.set(id, {
      ...comment,
      upvotes,
      downvotes
    });
  }

  // AI Chat operations
  async createAiChat(insertAiChat: InsertAiChat): Promise<AiChat> {
    const id = this.aiChatIdCounter++;
    const createdAt = new Date();
    const aiChat: AiChat = { ...insertAiChat, id, createdAt };
    this.aiChats.set(id, aiChat);
    return aiChat;
  }

  async getAiChat(id: number): Promise<AiChat | undefined> {
    return this.aiChats.get(id);
  }

  async getAiChatsByUserId(userId: number): Promise<AiChat[]> {
    return Array.from(this.aiChats.values())
      .filter(chat => chat.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // AI Chat Message operations
  async createAiChatMessage(insertAiChatMessage: InsertAiChatMessage): Promise<AiChatMessage> {
    const id = this.aiChatMessageIdCounter++;
    const createdAt = new Date();
    const aiChatMessage: AiChatMessage = { ...insertAiChatMessage, id, createdAt };
    this.aiChatMessages.set(id, aiChatMessage);
    return aiChatMessage;
  }

  async getAiChatMessages(chatId: number): Promise<AiChatMessage[]> {
    return Array.from(this.aiChatMessages.values())
      .filter(message => message.chatId === chatId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  // Document operations
  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.documentIdCounter++;
    const createdAt = new Date();
    const document: Document = { 
      ...insertDocument, 
      id, 
      createdAt,
      status: "processing",
      embeddingId: null
    };
    this.documents.set(id, document);
    return document;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async updateDocument(id: number, data: Partial<Document>): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;
    
    const updatedDocument = { ...document, ...data };
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }

  async getDocumentsByCategory(category: string): Promise<Document[]> {
    return Array.from(this.documents.values())
      .filter(document => document.category === category)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getAllDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async deleteDocument(id: number): Promise<void> {
    this.documents.delete(id);
  }

  // Vote operations
  async createVote(insertVote: InsertVote): Promise<Vote> {
    const id = this.voteIdCounter++;
    const createdAt = new Date();
    const vote: Vote = { ...insertVote, id, createdAt };
    this.votes.set(id, vote);
    return vote;
  }

  async getVoteByUserAndPost(userId: number, postId: number): Promise<Vote | undefined> {
    return Array.from(this.votes.values())
      .find(vote => vote.userId === userId && vote.postId === postId);
  }

  async getVoteByUserAndComment(userId: number, commentId: number): Promise<Vote | undefined> {
    return Array.from(this.votes.values())
      .find(vote => vote.userId === userId && vote.commentId === commentId);
  }

  async updateVote(id: number, data: Partial<Vote>): Promise<Vote | undefined> {
    const vote = this.votes.get(id);
    if (!vote) return undefined;
    
    const updatedVote = { ...vote, ...data };
    this.votes.set(id, updatedVote);
    return updatedVote;
  }

  async deleteVote(id: number): Promise<void> {
    this.votes.delete(id);
  }
}

export const storage = new MemStorage();
