import { Router } from "express";
import { XPService } from "../services/xp";
import { authenticateToken } from "../auth";

const router = Router();
const xpService = new XPService();

// XP awards for different actions
const XP_AWARDS = {
  COMPLETE_VIDEO: 50,
  COMPLETE_PLAYLIST: 200,
  PASS_QUIZ: 100,
  CREATE_POST: 10,
  RECEIVE_LIKE: 5
};

router.get("/leaderboard", async (req, res) => {
  const leaderboard = await xpService.getLeaderboard();
  res.json(leaderboard);
});

router.post("/award", authenticateToken, async (req, res) => {
  const { userId, action } = req.body;
  const xpAmount = XP_AWARDS[action] || 0;
  
  if (xpAmount) {
    const result = await xpService.awardXP(userId, xpAmount);
    res.json(result);
  } else {
    res.status(400).json({ error: "Invalid action" });
  }
});

export default router;