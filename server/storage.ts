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
  createAdminUser(username: string, password: string): Promise<User>;
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

  async createAdminUser(username: string, password: string): Promise<User> {
    const hashedPassword = await hashPassword(password);
    console.log("Creating admin user with hash:", hashedPassword);

    const [user] = await db
      .insert(users)
      .values({
        username,
        password: hashedPassword,
        isAdmin: true,
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

  async updatePlaylist(playlist: Playlist): Promise<Playlist> {
    const [updatedPlaylist] = await db
      .update(playlists)
      .set(playlist)
      .where(eq(playlists.id, playlist.id))
      .returning();
    return updatedPlaylist;
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

      await this.updateUserXP(userId, 50);

      return newProgress;
    }

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

      await this.updateUserXP(userId, 50);

      return updatedProgress;
    }

    return userProgress;
  }
}

// Default career paths data
const defaultCareerPaths = [
  {
    title: "MERN Stack Developer",
    description: "Master the MERN (MongoDB, Express, React, Node.js) stack and build full-stack web applications",
    requiredSkills: ["JavaScript", "React", "Node.js", "MongoDB", "Express.js"],
    roadmap: [
      { stage: "Fundamentals", skills: ["HTML", "CSS", "JavaScript Basics", "Git"] },
      { stage: "Frontend", skills: ["React", "Redux", "Material UI/Tailwind"] },
      { stage: "Backend", skills: ["Node.js", "Express.js", "REST APIs"] },
      { stage: "Database", skills: ["MongoDB", "Mongoose", "Database Design"] },
      { stage: "DevOps", skills: ["Docker", "CI/CD", "AWS Basics"] }
    ]
  },
  {
    title: "Software Engineer",
    description: "Comprehensive software engineering path covering fundamentals to advanced concepts",
    requiredSkills: ["Data Structures", "Algorithms", "System Design", "Programming Languages"],
    roadmap: [
      { stage: "Programming Basics", skills: ["Python", "Java", "Data Structures"] },
      { stage: "Software Design", skills: ["OOP", "Design Patterns", "Clean Code"] },
      { stage: "Web Development", skills: ["Full Stack Development", "APIs"] },
      { stage: "Advanced Topics", skills: ["System Design", "Scalability", "Security"] },
      { stage: "Best Practices", skills: ["Testing", "Code Review", "Documentation"] }
    ]
  },
  {
    title: "AI/ML Developer",
    description: "Learn artificial intelligence and machine learning from basics to advanced applications",
    requiredSkills: ["Python", "Mathematics", "Machine Learning", "Deep Learning"],
    roadmap: [
      { stage: "Prerequisites", skills: ["Python", "Statistics", "Linear Algebra"] },
      { stage: "ML Fundamentals", skills: ["Scikit-learn", "Data Processing", "Model Evaluation"] },
      { stage: "Deep Learning", skills: ["TensorFlow", "Neural Networks", "Computer Vision"] },
      { stage: "Advanced ML", skills: ["NLP", "Reinforcement Learning", "MLOps"] },
      { stage: "Projects", skills: ["Real-world Applications", "Model Deployment"] }
    ]
  },
  {
    title: "DevOps Engineer",
    description: "Master the tools and practices of modern DevOps and cloud infrastructure",
    requiredSkills: ["Linux", "Cloud Platforms", "CI/CD", "Infrastructure as Code"],
    roadmap: [
      { stage: "Fundamentals", skills: ["Linux", "Networking", "Shell Scripting"] },
      { stage: "Cloud & Containers", skills: ["AWS/Azure", "Docker", "Kubernetes"] },
      { stage: "Automation", skills: ["CI/CD", "Jenkins", "GitHub Actions"] },
      { stage: "Infrastructure", skills: ["Terraform", "Ansible", "Monitoring"] },
      { stage: "Security", skills: ["DevSecOps", "Security Tools", "Best Practices"] }
    ]
  }
];

export const storage = new DatabaseStorage();

// Initialize career paths
(async () => {
  try {
    const paths = await db.select().from(careerPaths);
    if (paths.length === 0) {
      await db.insert(careerPaths).values(defaultCareerPaths);
      console.log("Career paths initialized");
    }
  } catch (error) {
    console.error("Failed to initialize career paths:", error);
  }
})();