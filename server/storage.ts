import { 
  users, type User, type InsertUser,
  posts, type Post, type InsertPost,
  comments, type Comment, type InsertComment,
  aiChats, type AiChat, type InsertAiChat,
  aiChatMessages, type AiChatMessage, type InsertAiChatMessage,
  documents, type Document, type InsertDocument,
  votes, type Vote, type InsertVote
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql, ilike, or } from "drizzle-orm";

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

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Post operations
  async createPost(insertPost: InsertPost): Promise<Post> {
    const [post] = await db.insert(posts).values(insertPost).returning();
    return post;
  }

  async getPost(id: number): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post;
  }

  async updatePost(id: number, data: Partial<Post>): Promise<Post | undefined> {
    const [post] = await db
      .update(posts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(posts.id, id))
      .returning();
    return post;
  }

  async getPostsByCategory(category: string, page: number, limit: number, sortBy: string): Promise<Post[]> {
    let query = db.select().from(posts).where(eq(posts.category, category));
    
    // Note: We need to handle the SQL generation with proper typing
    if (sortBy === "recent") {
      return await db
        .select()
        .from(posts)
        .where(eq(posts.category, category))
        .orderBy(desc(posts.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);
    } else if (sortBy === "popular") {
      return await db
        .select()
        .from(posts)
        .where(eq(posts.category, category))
        .orderBy(desc(posts.views))
        .limit(limit)
        .offset((page - 1) * limit);
    } else if (sortBy === "answered") {
      return await db
        .select()
        .from(posts)
        .where(eq(posts.category, category))
        .orderBy(desc(posts.isAnswered), desc(posts.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);
    }
    
    // Default sorting by recent
    return await db
      .select()
      .from(posts)
      .where(eq(posts.category, category))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
  }

  async countPostsByCategory(category: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(eq(posts.category, category));
    return result[0]?.count || 0;
  }

  async searchPosts(query: string): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .where(
        or(
          ilike(posts.title, `%${query}%`),
          ilike(posts.content, `%${query}%`)
        )
      )
      .orderBy(desc(posts.createdAt));
  }

  async searchPostsByCategory(query: string, category: string): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .where(
        and(
          eq(posts.category, category),
          or(
            ilike(posts.title, `%${query}%`),
            ilike(posts.content, `%${query}%`)
          )
        )
      )
      .orderBy(desc(posts.createdAt));
  }

  // Comment operations
  async createComment(insertComment: InsertComment): Promise<Comment> {
    const [comment] = await db.insert(comments).values(insertComment).returning();
    return comment;
  }

  async getComment(id: number): Promise<Comment | undefined> {
    const [comment] = await db.select().from(comments).where(eq(comments.id, id));
    return comment;
  }

  async getCommentsByPostId(postId: number): Promise<Comment[]> {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.postId, postId))
      .orderBy(
        desc(comments.isAiGenerated),
        desc(sql`(${comments.upvotes} - ${comments.downvotes})`),
        desc(comments.createdAt)
      );
  }

  async updateCommentVoteCounts(id: number): Promise<void> {
    const upvotesCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(votes)
      .where(and(eq(votes.commentId, id), eq(votes.voteType, 'upvote')));
    
    const downvotesCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(votes)
      .where(and(eq(votes.commentId, id), eq(votes.voteType, 'downvote')));
    
    await db
      .update(comments)
      .set({ 
        upvotes: upvotesCount[0]?.count || 0,
        downvotes: downvotesCount[0]?.count || 0 
      })
      .where(eq(comments.id, id));
  }

  // AI Chat operations
  async createAiChat(insertAiChat: InsertAiChat): Promise<AiChat> {
    const [chat] = await db.insert(aiChats).values(insertAiChat).returning();
    return chat;
  }

  async getAiChat(id: number): Promise<AiChat | undefined> {
    const [chat] = await db.select().from(aiChats).where(eq(aiChats.id, id));
    return chat;
  }

  async getAiChatsByUserId(userId: number): Promise<AiChat[]> {
    return await db
      .select()
      .from(aiChats)
      .where(eq(aiChats.userId, userId))
      .orderBy(desc(aiChats.createdAt));
  }

  // AI Chat Message operations
  async createAiChatMessage(insertAiChatMessage: InsertAiChatMessage): Promise<AiChatMessage> {
    const [message] = await db.insert(aiChatMessages).values(insertAiChatMessage).returning();
    return message;
  }

  async getAiChatMessages(chatId: number): Promise<AiChatMessage[]> {
    return await db
      .select()
      .from(aiChatMessages)
      .where(eq(aiChatMessages.chatId, chatId))
      .orderBy(asc(aiChatMessages.createdAt));
  }

  // Document operations
  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db
      .insert(documents)
      .values({ ...insertDocument, status: "processing" })
      .returning();
    return document;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }

  async updateDocument(id: number, data: Partial<Document>): Promise<Document | undefined> {
    const [document] = await db
      .update(documents)
      .set(data)
      .where(eq(documents.id, id))
      .returning();
    return document;
  }

  async getDocumentsByCategory(category: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.category, category))
      .orderBy(desc(documents.createdAt));
  }

  async getAllDocuments(): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .orderBy(desc(documents.createdAt));
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // Vote operations
  async createVote(insertVote: InsertVote): Promise<Vote> {
    const [vote] = await db.insert(votes).values(insertVote).returning();
    return vote;
  }

  async getVoteByUserAndPost(userId: number, postId: number): Promise<Vote | undefined> {
    const [vote] = await db
      .select()
      .from(votes)
      .where(and(eq(votes.userId, userId), eq(votes.postId, postId)));
    return vote;
  }

  async getVoteByUserAndComment(userId: number, commentId: number): Promise<Vote | undefined> {
    const [vote] = await db
      .select()
      .from(votes)
      .where(and(eq(votes.userId, userId), eq(votes.commentId, commentId)));
    return vote;
  }

  async updateVote(id: number, data: Partial<Vote>): Promise<Vote | undefined> {
    const [vote] = await db
      .update(votes)
      .set(data)
      .where(eq(votes.id, id))
      .returning();
    return vote;
  }

  async deleteVote(id: number): Promise<void> {
    await db.delete(votes).where(eq(votes.id, id));
  }
}

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();