import { db } from "../db";
import { users } from "../../shared/schema";
import { eq } from "drizzle-orm";

export class XPService {
  // XP required for each level = base_xp * (level ^ 1.5)
  private calculateXPForLevel(level: number): number {
    const baseXP = 100;
    return Math.floor(baseXP * Math.pow(level, 1.5));
  }

  private calculateLevelFromXP(xp: number): number {
    let level = 1;
    while (this.calculateXPForLevel(level + 1) <= xp) {
      level++;
    }
    return level;
  }

  async awardXP(userId: number, amount: number) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    const newXP = user.xp + amount;
    const newLevel = this.calculateLevelFromXP(newXP);

    return await db
      .update(users)
      .set({ xp: newXP, level: newLevel })
      .where(eq(users.id, userId))
      .returning();
  }

  async getLeaderboard(limit = 10) {
    return await db
      .select()
      .from(users)
      .orderBy(users.xp)
      .limit(limit);
  }
}