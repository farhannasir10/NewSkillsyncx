import { User, InsertUser, Playlist, Progress } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { hashPassword } from "./utils/password";

const MemoryStore = createMemoryStore(session);

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private playlists: Map<number, Playlist>;
  private progress: Map<string, Progress>;
  private currentIds: { [key: string]: number };
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.playlists = new Map();
    this.progress = new Map();
    this.currentIds = { users: 1, playlists: 1, progress: 1 };
    this.sessionStore = new MemoryStore({ checkPeriod: 86400000 });

    // Create admin user
    this.createAdminUser();
    // Add some sample playlists
    this.seedPlaylists();
  }

  private async createAdminUser() {
    const adminUser: InsertUser = {
      username: "admin@learnhub.com",
      password: "Admin@123", // Will be hashed in createUser
    };
    const user = await this.createUser(adminUser);
    // Update the user to be an admin after creation
    const adminData = { ...user, isAdmin: true };
    this.users.set(user.id, adminData);
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentIds.users++;
    const hashedPassword = await hashPassword(insertUser.password);
    const user: User = {
      ...insertUser,
      id,
      password: hashedPassword,
      isAdmin: false,
      xp: 0,
      level: 1,
      achievements: []
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserXP(userId: number, xp: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    user.xp += xp;
    user.level = Math.floor(user.xp / 1000) + 1;
    this.users.set(userId, user);
    return user;
  }

  async getPlaylists(): Promise<Playlist[]> {
    return Array.from(this.playlists.values());
  }

  async getPlaylist(id: number): Promise<Playlist | undefined> {
    return this.playlists.get(id);
  }

  async createPlaylist(playlist: Omit<Playlist, "id">): Promise<Playlist> {
    const id = this.currentIds.playlists++;
    const newPlaylist = { ...playlist, id };
    this.playlists.set(id, newPlaylist);
    return newPlaylist;
  }

  async deletePlaylist(id: number): Promise<void> {
    this.playlists.delete(id);
  }

  async getProgress(userId: number, playlistId: number): Promise<Progress | undefined> {
    const key = `${userId}-${playlistId}`;
    return this.progress.get(key);
  }

  async updateProgress(userId: number, playlistId: number, videoId: string): Promise<Progress> {
    const key = `${userId}-${playlistId}`;
    let progress = await this.getProgress(userId, playlistId);

    if (!progress) {
      progress = {
        id: this.currentIds.progress++,
        userId,
        playlistId,
        completedVideos: [],
        lastWatched: videoId
      };
    }

    if (!progress.completedVideos.includes(videoId)) {
      progress.completedVideos = [...progress.completedVideos, videoId];
      progress.lastWatched = videoId;
      await this.updateUserXP(userId, 50); // Award XP for completing a video
    }

    this.progress.set(key, progress);
    return progress;
  }

  private seedPlaylists() {
    const samplePlaylists: Omit<Playlist, "id">[] = [
      {
        title: "React Fundamentals",
        description: "Learn React from scratch with practical examples",
        creatorId: 1,
        playlistUrl: "https://www.youtube.com/playlist?list=PLN3n1USn4xlntqksY83W3997mmQPrUmqM",
        videos: [
          { id: "w7ejDZ8SWv8", title: "React JS Crash Course", thumbnail: "", duration: "1:48:47" },
          { id: "4UZrsTqkcW4", title: "React Tutorial for Beginners", thumbnail: "", duration: "2:30:33" }
        ],
        tags: ["react", "javascript", "frontend"]
      },
      {
        title: "Node.js Essentials",
        description: "Master backend development with Node.js",
        creatorId: 1,
        playlistUrl: "https://www.youtube.com/playlist?list=PL4cUxeGkcC9jsz4LDYc6kv3ymONOKxwBU",
        videos: [
          { id: "Oe421EPjeBE", title: "Node.js and Express.js - Full Course", thumbnail: "", duration: "8:16:48" }
        ],
        tags: ["nodejs", "javascript", "backend"]
      }
    ];

    samplePlaylists.forEach(playlist => {
      this.createPlaylist(playlist);
    });
  }
}

export const storage = new MemStorage();