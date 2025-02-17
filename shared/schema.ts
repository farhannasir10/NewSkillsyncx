import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  achievements: jsonb("achievements").notNull().default([]),
});

export const playlists = pgTable("playlists", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  creatorId: integer("creator_id").notNull(),
  videos: jsonb("videos").notNull().default([]),
  tags: text("tags").array().notNull().default([]),
});

export const progress = pgTable("progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  playlistId: integer("playlist_id").notNull(),
  completedVideos: jsonb("completed_videos").notNull().default([]),
  lastWatched: text("last_watched"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPlaylistSchema = createInsertSchema(playlists).pick({
  title: true,
  description: true,
  videos: true,
  tags: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Playlist = typeof playlists.$inferSelect;
export type Progress = typeof progress.$inferSelect;

export type Video = {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
};
