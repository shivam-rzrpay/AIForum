import { pgTable, text, serial, integer, boolean, timestamp, json, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  department: text("department"),
  jobTitle: text("job_title"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  name: true,
  avatar: true,
  department: true,
  jobTitle: true,
});

// Forum category enum
export const forumCategoryEnum = pgEnum("forum_category", [
  "technical", 
  "ideas", 
  "general", 
  "hr"
]);

// Post schema
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  category: forumCategoryEnum("category").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
  tags: text("tags").array(),
  views: integer("views").default(0),
  isAnswered: boolean("is_answered").default(false),
  hasAiAnswer: boolean("has_ai_answer").default(false),
});

export const insertPostSchema = createInsertSchema(posts).pick({
  title: true,
  content: true,
  userId: true,
  category: true,
  tags: true,
});

// Comment schema
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  postId: integer("post_id").notNull().references(() => posts.id),
  userId: integer("user_id").notNull().references(() => users.id),
  isAiGenerated: boolean("is_ai_generated").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  upvotes: integer("upvotes").default(0),
  downvotes: integer("downvotes").default(0),
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  content: true,
  postId: true,
  userId: true,
  isAiGenerated: true,
});

// AI Chat schema
export const aiChats = pgTable("ai_chats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  category: forumCategoryEnum("category").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAiChatSchema = createInsertSchema(aiChats).pick({
  userId: true,
  category: true,
});

// AI Chat Messages schema
export const aiChatMessages = pgTable("ai_chat_messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").notNull().references(() => aiChats.id),
  content: text("content").notNull(),
  isUserMessage: boolean("is_user_message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAiChatMessageSchema = createInsertSchema(aiChatMessages).pick({
  chatId: true,
  content: true,
  isUserMessage: true,
});

// Document schema
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  category: forumCategoryEnum("category").notNull(),
  documentType: text("document_type").notNull(),
  filePath: text("file_path").notNull(),
  uploadedById: integer("uploaded_by_id").notNull().references(() => users.id),
  status: text("status").default("processing").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  embeddingId: text("embedding_id"),
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  name: true,
  description: true,
  fileType: true,
  fileSize: true,
  category: true,
  documentType: true,
  filePath: true,
  uploadedById: true,
});

// Votes schema
export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id),
  commentId: integer("comment_id").references(() => comments.id),
  userId: integer("user_id").notNull().references(() => users.id),
  voteType: text("vote_type").notNull(), // 'upvote' or 'downvote'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVoteSchema = createInsertSchema(votes).pick({
  postId: true,
  commentId: true,
  userId: true,
  voteType: true,
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type AiChat = typeof aiChats.$inferSelect;
export type InsertAiChat = z.infer<typeof insertAiChatSchema>;

export type AiChatMessage = typeof aiChatMessages.$inferSelect;
export type InsertAiChatMessage = z.infer<typeof insertAiChatMessageSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type Vote = typeof votes.$inferSelect;
export type InsertVote = z.infer<typeof insertVoteSchema>;
