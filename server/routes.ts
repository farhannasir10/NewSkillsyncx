import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { generateVideoNotes } from "./services/ai";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  app.get("/api/playlists", async (req, res) => {
    const playlists = await storage.getPlaylists();
    res.json(playlists);
  });


import { google } from 'googleapis';

const youtube = google.youtube('v3');

app.get("/api/youtube/playlist/:playlistId", async (req, res) => {
  try {
    const playlistId = req.params.playlistId;
    const response = await youtube.playlistItems.list({
      key: process.env.YOUTUBE_API_KEY,
      part: ['snippet', 'contentDetails'],
      playlistId: playlistId,
      maxResults: 50
    });

    const videos = response.data.items?.map(item => ({
      id: item.snippet?.resourceId?.videoId,
      title: item.snippet?.title,
      thumbnail: item.snippet?.thumbnails?.default?.url
    })) || [];

    res.json(videos);
  } catch (error) {
    console.error('YouTube API error:', error);
    res.status(500).json({ error: 'Failed to fetch playlist data' });
  }
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

  app.delete("/api/playlists/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.user?.isAdmin) return res.sendStatus(403);

    await storage.deletePlaylist(parseInt(req.params.id));
    res.sendStatus(200);
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

  app.post("/api/notes/generate", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { transcript } = req.body;
      if (!transcript) {
        return res.status(400).send("Transcript is required");
      }

      const notes = await generateVideoNotes(transcript);
      res.json({ notes });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}