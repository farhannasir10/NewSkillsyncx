import type { Express } from "express";
import { createServer, type Server } from "http";
import { Router } from "express";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { db } from "./db";
import { careerPaths } from "@shared/schema";

const router = Router();

router.get("/api/career-paths", async (req, res) => {
  try {
    const paths = await db.select().from(careerPaths);
    res.json(paths);
  } catch (error) {
    console.error("Error fetching career paths:", error);
    res.status(500).json({ error: "Failed to fetch career paths" });
  }
});

import { generateVideoNotes } from "./services/ai";
import { google } from 'googleapis';

const youtube = google.youtube({
  version: 'v3',
  auth: 'AIzaSyDSn-suGuS8h2enE3hUXNEMnLL0Zl2b3R8'
});

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);
  app.use(router);

  app.get("/api/playlists", async (req, res) => {
    const playlists = await storage.getPlaylists();
    res.json(playlists);
  });

  app.get("/api/youtube/playlist/:playlistId", async (req, res) => {
    try {
      const playlistId = req.params.playlistId;

      // Fetch all videos using pagination
      let allItems = [];
      let nextPageToken = undefined;

      do {
        const playlistResponse = await youtube.playlistItems.list({
          part: ['snippet', 'contentDetails'],
          playlistId: playlistId,
          maxResults: 50,
          pageToken: nextPageToken
        });

        if (playlistResponse.data.items) {
          allItems = [...allItems, ...playlistResponse.data.items];
        }

        nextPageToken = playlistResponse.data.nextPageToken;
      } while (nextPageToken);


      if (!allItems || allItems.length === 0) {
        return res.status(404).json({ error: 'No videos found in playlist' });
      }

      // Extract video IDs to get duration information
      const videoIds = allItems
        .map(item => item.snippet?.resourceId?.videoId)
        .filter(id => id);

      // Get video details in batches of 50 (YouTube API limit)
      const batches = [];
      for (let i = 0; i < videoIds.length; i += 50) {
        const batchIds = videoIds.slice(i, i + 50);
        const videoDetailsResponse = await youtube.videos.list({
          part: ['contentDetails', 'snippet'],
          id: batchIds
        });
        if (videoDetailsResponse.data.items) {
          batches.push(...videoDetailsResponse.data.items);
        }
      }

      // Create a map of video durations
      const durationMap = new Map();
      batches.forEach(video => {
        if (video.id && video.contentDetails?.duration) {
          // Convert ISO 8601 duration to readable format
          const duration = video.contentDetails.duration
            .replace('PT', '')
            .replace('H', 'h ')
            .replace('M', 'm ')
            .replace('S', 's');
          durationMap.set(video.id, duration);
        }
      });

      // Map playlist items to our video format
      const videos = allItems?.map(item => {
        const videoId = item.snippet?.resourceId?.videoId || '';
        return {
          id: videoId,
          title: item.snippet?.title || 'Untitled Video',
          thumbnail: item.snippet?.thumbnails?.medium?.url || '',
          duration: durationMap.get(videoId) || 'Unknown'
        };
      }).filter(video => video.id && video.title);

      if (videos.length === 0) {
        return res.status(404).json({ error: 'No valid videos found in playlist' });
      }

      res.json(videos);
    } catch (error) {
      console.error('YouTube API error:', error);
      const message = error.response?.data?.error?.message || 'Failed to fetch playlist data';
      res.status(500).json({ error: message });
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

    try {
      const { playlistUrl } = req.body;
      const playlistId = playlistUrl.split('list=')[1]?.split('&')[0];

      if (!playlistId) {
        return res.status(400).json({ error: 'Invalid playlist URL' });
      }

      // Get playlist details
      let allItems = [];
      let nextPageToken = undefined;

      do {
        const playlistResponse = await youtube.playlistItems.list({
          part: ['snippet', 'contentDetails'],
          playlistId: playlistId,
          maxResults: 50,
          pageToken: nextPageToken
        });

        if (playlistResponse.data.items) {
          allItems = [...allItems, ...playlistResponse.data.items];
        }

        nextPageToken = playlistResponse.data.nextPageToken;
      } while (nextPageToken);

      if (!allItems) {
        return res.status(404).json({ error: 'No videos found in playlist' });
      }

      // Map videos to our format
      const videos = allItems.map(item => ({
        id: item.snippet?.resourceId?.videoId || '',
        title: item.snippet?.title || '',
        thumbnail: item.snippet?.thumbnails?.medium?.url || '',
      })).filter(video => video.id && video.title);

      const playlist = await storage.createPlaylist({
        ...req.body,
        videos,
        creatorId: req.user.id
      });

      res.status(201).json(playlist);
    } catch (error) {
      console.error('YouTube API error:', error);
      const message = error.response?.data?.error?.message || 'Failed to fetch playlist';
      res.status(500).json({ error: message });
    }
  });

  app.delete("/api/playlists/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.user?.isAdmin) return res.sendStatus(403);

    await storage.deletePlaylist(parseInt(req.params.id));
    res.sendStatus(200);
  });

  app.put("/api/playlists/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.user?.isAdmin) return res.sendStatus(403);

    try {
      const playlist = await storage.getPlaylist(parseInt(req.params.id));
      if (!playlist) return res.status(404).send("Playlist not found");

      // Update videos
      if (req.body.videos) {
        playlist.videos = req.body.videos;
      }

      // Update other fields if needed
      const updatedPlaylist = await storage.updatePlaylist(playlist);
      res.json(updatedPlaylist);
    } catch (error) {
      console.error("Failed to update playlist:", error);
      res.status(500).json({ error: "Failed to update playlist" });
    }
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