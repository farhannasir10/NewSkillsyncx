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
    description: "Master the MERN stack (MongoDB, Express, React, Node.js) for modern web applications",
    requiredSkills: ["JavaScript", "React", "Node.js", "MongoDB"],
    roadmap: [
      { stage: "Fundamentals", skills: ["HTML", "CSS", "JavaScript", "Git"] },
      { stage: "Frontend", skills: ["React", "Redux", "Material UI/Tailwind"] },
      { stage: "Backend", skills: ["Node.js", "Express.js", "REST APIs"] },
      { stage: "Database", skills: ["MongoDB", "Mongoose", "Database Design"] }
    ]
  },
  {
    title: "Python Full-Stack Developer",
    description: "Build web applications using Python, Django, and modern frontend technologies",
    requiredSkills: ["Python", "Django", "JavaScript", "SQL"],
    roadmap: [
      { stage: "Basics", skills: ["Python", "HTML/CSS", "JavaScript"] },
      { stage: "Backend", skills: ["Django", "DRF", "PostgreSQL"] },
      { stage: "Frontend", skills: ["React", "TypeScript", "Redux"] },
      { stage: "Advanced", skills: ["AWS", "Docker", "CI/CD"] }
    ]
  },
  {
    title: "Java Enterprise Developer",
    description: "Enterprise-level development with Java and Spring ecosystem",
    requiredSkills: ["Java", "Spring", "SQL", "Maven"],
    roadmap: [
      { stage: "Core", skills: ["Java", "OOP", "Data Structures"] },
      { stage: "Framework", skills: ["Spring Boot", "Spring Security", "JPA"] },
      { stage: "Database", skills: ["MySQL", "Hibernate", "Redis"] },
      { stage: "Tools", skills: ["Maven", "Jenkins", "JUnit"] }
    ]
  },
  {
    title: "Unity Game Developer",
    description: "Create immersive games using Unity and C#",
    requiredSkills: ["C#", "Unity", "3D Mathematics", "Game Design"],
    roadmap: [
      { stage: "Fundamentals", skills: ["C#", "Unity Basics", "2D Games"] },
      { stage: "Graphics", skills: ["3D Modeling", "Animation", "Shaders"] },
      { stage: "Systems", skills: ["Physics", "AI", "Networking"] },
      { stage: "Polish", skills: ["UI/UX", "Audio", "Optimization"] }
    ]
  },
  {
    title: "Mobile App Developer",
    description: "Build cross-platform mobile applications using React Native",
    requiredSkills: ["JavaScript", "React Native", "Mobile Design", "APIs"],
    roadmap: [
      { stage: "Basics", skills: ["JavaScript", "React", "Mobile UI"] },
      { stage: "Native", skills: ["React Native", "Navigation", "State Management"] },
      { stage: "Features", skills: ["Native APIs", "Push Notifications", "Storage"] },
      { stage: "Deployment", skills: ["App Store", "Play Store", "CI/CD"] }
    ]
  },
  {
    title: "AI/ML Engineer",
    description: "Master artificial intelligence and machine learning",
    requiredSkills: ["Python", "Mathematics", "ML Algorithms", "Deep Learning"],
    roadmap: [
      { stage: "Foundation", skills: ["Python", "Stats", "Linear Algebra"] },
      { stage: "ML", skills: ["Scikit-learn", "Pandas", "Model Training"] },
      { stage: "Deep Learning", skills: ["TensorFlow", "PyTorch", "CNNs"] },
      { stage: "Advanced", skills: ["NLP", "Computer Vision", "MLOps"] }
    ]
  },
  {
    title: "DevOps Engineer",
    description: "Implement and maintain CI/CD pipelines and cloud infrastructure",
    requiredSkills: ["Linux", "Cloud", "CI/CD", "Containers"],
    roadmap: [
      { stage: "Basics", skills: ["Linux", "Networking", "Shell Scripting"] },
      { stage: "Cloud", skills: ["AWS", "Azure", "GCP"] },
      { stage: "Tools", skills: ["Docker", "Kubernetes", "Terraform"] },
      { stage: "Practices", skills: ["CI/CD", "Monitoring", "Security"] }
    ]
  },
  {
    title: "Blockchain Developer",
    description: "Develop decentralized applications and smart contracts",
    requiredSkills: ["Solidity", "Web3.js", "Blockchain", "JavaScript"],
    roadmap: [
      { stage: "Basics", skills: ["Blockchain Theory", "Cryptography", "JavaScript"] },
      { stage: "Smart Contracts", skills: ["Solidity", "Truffle", "Web3.js"] },
      { stage: "DApps", skills: ["React", "Ethers.js", "IPFS"] },
      { stage: "Advanced", skills: ["Security", "Layer 2", "DeFi"] }
    ]
  },
  {
    title: "Cloud Solutions Architect",
    description: "Design and implement scalable cloud solutions",
    requiredSkills: ["Cloud Platforms", "System Design", "Security", "Networking"],
    roadmap: [
      { stage: "Foundation", skills: ["AWS/Azure", "Networking", "Security"] },
      { stage: "Services", skills: ["Compute", "Storage", "Database"] },
      { stage: "Architecture", skills: ["Microservices", "Serverless", "IaC"] },
      { stage: "Enterprise", skills: ["Cost Optimization", "Compliance", "Migration"] }
    ]
  }
];

export const storage = new DatabaseStorage();

// Initialize career paths
(async () => {
  try {
    const paths = await db.select().from(careerPaths);
    if (paths.length === 0) {
      await db.insert(careerPaths).values(defaultCareerPaths.map(path => ({
        ...path,
        requiredSkills: JSON.stringify(path.requiredSkills),
        roadmap: JSON.stringify(path.roadmap),
        createdAt: new Date()
      })));
      console.log("Career paths initialized");
    }
  } catch (error) {
    console.error("Failed to initialize career paths:", error);
  }
})();