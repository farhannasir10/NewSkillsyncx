import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  app.get("/api/playlists", async (req, res) => {
    const playlists = await storage.getPlaylists();
    res.json(playlists);
  });

  app.get("/api/playlists/:id", async (req, res) => {
    const playlist = await storage.getPlaylist(parseInt(req.params.id));
    if (!playlist) return res.status(404).send("Playlist not found");
    res.json(playlist);
  });

  app.post("/api/playlists", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.user?.isAdmin) return res.sendStatus(403);

    const playlist = await storage.createPlaylist({
      ...req.body,
      creatorId: req.user.id
    });
    res.status(201).json(playlist);
  });

  app.get("/api/progress/:playlistId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const progress = await storage.getProgress(
      req.user!.id,
      parseInt(req.params.playlistId)
    );
    res.json(progress || { completedVideos: [] });
  });

  app.post("/api/progress/:playlistId/complete", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { videoId } = req.body;
    const progress = await storage.updateProgress(
      req.user!.id,
      parseInt(req.params.playlistId),
      videoId
    );
    const user = await storage.getUser(req.user!.id);
    res.json({ progress, user });
  });

  const httpServer = createServer(app);
  return httpServer;
}