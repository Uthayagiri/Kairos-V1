import { prisma } from '../db/prisma.js';
import { UUIDSchema } from '../validators/schemas.js';
import { progressionService } from './progression.service.js';
import { AchievementRarity } from './progressionEngine.service.js';

export class AchievementService {
  public async getUserAchievements(userId: string) {
    const validatedId = UUIDSchema.parse(userId);
    return prisma.achievementProgress.findMany({
      where: { userId: validatedId }
    });
  }

  public async updateProgress(
    userId: string,
    achievementId: string,
    currentProgress: number,
    targetProgress: number
  ) {
    const validatedId = UUIDSchema.parse(userId);
    const isUnlocked = currentProgress >= targetProgress;

    return prisma.achievementProgress.upsert({
      where: {
        unique_user_achievement: {
          userId: validatedId,
          achievementId
        }
      },
      update: {
        currentProgress,
        targetProgress,
        isUnlocked,
        unlockedAt: isUnlocked ? new Date() : undefined
      },
      create: {
        userId: validatedId,
        achievementId,
        currentProgress,
        targetProgress,
        isUnlocked,
        unlockedAt: isUnlocked ? new Date() : undefined
      }
    });
  }

  public async claimReward(
    userId: string,
    achievementId: string,
    rarity: AchievementRarity,
    idempotencyKey: string
  ) {
    return progressionService.claimAchievementReward(userId, {
      achievementId,
      rarity,
      idempotencyKey
    });
  }
}

export const achievementService = new AchievementService();
