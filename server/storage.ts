import { User, InsertUser, Playlist, Progress, users, playlists, progress } from "@shared/schema";
import session from "express-session";
import { db } from "./db";
import { eq } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { hashPassword } from "./utils/password";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserXP(userId: number, xp: number): Promise<User>;

  getPlaylists(): Promise<Playlist[]>;
  getPlaylist(id: number): Promise<Playlist | undefined>;
  createPlaylist(playlist: Omit<Playlist, "id">): Promise<Playlist>;
  deletePlaylist(id: number): Promise<void>;

  getProgress(userId: number, playlistId: number): Promise<Progress | undefined>;
  updateProgress(userId: number, playlistId: number, videoId: string): Promise<Progress>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await hashPassword(insertUser.password);
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword,
        isAdmin: false,
        xp: 0,
        level: 1,
        achievements: [],
        careerPath: null,
        bio: null,
        avatarUrl: null,
        createdAt: new Date()
      })
      .returning();
    return user;
  }

  async updateUserXP(userId: number, xp: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const newXP = user.xp + xp;
    const newLevel = Math.floor(newXP / 1000) + 1;

    const [updatedUser] = await db
      .update(users)
      .set({ xp: newXP, level: newLevel })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }

  async getPlaylists(): Promise<Playlist[]> {
    return await db.select().from(playlists);
  }

  async getPlaylist(id: number): Promise<Playlist | undefined> {
    const [playlist] = await db.select().from(playlists).where(eq(playlists.id, id));
    return playlist;
  }

  async createPlaylist(playlist: Omit<Playlist, "id">): Promise<Playlist> {
    const [newPlaylist] = await db
      .insert(playlists)
      .values({
        ...playlist,
        category: null,
        difficulty: null,
        createdAt: new Date()
      })
      .returning();
    return newPlaylist;
  }

  async deletePlaylist(id: number): Promise<void> {
    await db.delete(playlists).where(eq(playlists.id, id));
  }

  async getProgress(userId: number, playlistId: number): Promise<Progress | undefined> {
    const [userProgress] = await db
      .select()
      .from(progress)
      .where(eq(progress.userId, userId))
      .where(eq(progress.playlistId, playlistId));
    return userProgress;
  }

  async updateProgress(userId: number, playlistId: number, videoId: string): Promise<Progress> {
    let userProgress = await this.getProgress(userId, playlistId);

    if (!userProgress) {
      // Create new progress entry
      const [newProgress] = await db
        .insert(progress)
        .values({
          userId,
          playlistId,
          completedVideos: [videoId],
          lastWatched: videoId,
          updatedAt: new Date()
        })
        .returning();

      // Award XP for first video completion
      await this.updateUserXP(userId, 50);

      return newProgress;
    }

    // Update existing progress
    if (!userProgress.completedVideos.includes(videoId)) {
      const completedVideos = [...userProgress.completedVideos, videoId];
      const [updatedProgress] = await db
        .update(progress)
        .set({
          completedVideos,
          lastWatched: videoId,
          updatedAt: new Date()
        })
        .where(eq(progress.id, userProgress.id))
        .returning();

      // Award XP for completing new video
      await this.updateUserXP(userId, 50);

      return updatedProgress;
    }

    return userProgress;
  }
}

export const storage = new DatabaseStorage();