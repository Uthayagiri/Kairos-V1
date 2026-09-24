import { prisma } from '../db/prisma.js';
import { UUIDSchema, CompleteTaskSchema, ClaimAchievementSchema } from '../validators/schemas.js';
import {
  calculateReward,
  addExperience,
  getLevelForTotalXP,
  calculateAchievementXpReward,
  calculateCurrentStreak,
  AchievementRarity
} from './progressionEngine.service.js';

export interface ProgressionResult {
  status: 'SUCCESS' | 'ALREADY_PROCESSED' | 'ERROR';
  earnedXp: number;
  earnedHp: number;
  progression: {
    totalXp: number;
    xpRemainder: number;
    level: number;
    todayHp: number;
    lifetimeHp: number;
    streakCount: number;
    lastActiveDate: string;
  };
  isDuplicate: boolean;
  message?: string;
}

export class ProgressionService {
  /**
   * Retrieves or initializes the user's authoritative progression state.
   */
  public async getProgression(userId: string) {
    const validatedId = UUIDSchema.parse(userId);
    let state = await prisma.progressionState.findUnique({
      where: { userId: validatedId }
    });

    if (!state) {
      state = await prisma.progressionState.create({
        data: {
          userId: validatedId,
          totalXp: 0,
          xpRemainder: 0.0,
          level: 1,
          todayHp: 0,
          lifetimeHp: 0,
          streakCount: 0,
          lastActiveDate: ''
        }
      });
    }

    return state;
  }

  /**
   * Server-Authoritative Task Completion & Progression Award.
   * 
   * Strict Invariants:
   * 1. Anti-Duplication: Exactly 1 completion per user per task per calendar date.
   * 2. Idempotency: Duplicate idempotency keys return cached success without awarding additional XP/HP.
   * 3. Server-Calculated Rewards: Server computes preCap / postCap HP-to-XP conversions. Never trusts client values.
   */
  public async completeTaskAndAwardProgression(
    userId: string,
    params: {
      taskId: string;
      completionDate: string;
      taskHp?: number;
      idempotencyKey: string;
    }
  ): Promise<ProgressionResult> {
    const validatedId = UUIDSchema.parse(userId);
    const validated = CompleteTaskSchema.parse(params);

    return prisma.$transaction(async (tx) => {
      // 1. Check Anti-Duplication Ledger (Date constraint & Idempotency constraint)
      const existingCompletion = await tx.taskCompletion.findFirst({
        where: {
          userId: validatedId,
          OR: [
            {
              taskId: validated.taskId,
              completionDate: validated.completionDate
            },
            {
              idempotencyKey: validated.idempotencyKey
            }
          ]
        }
      });

      const currentState = await tx.progressionState.findUnique({
        where: { userId: validatedId }
      });

      if (!currentState) {
        throw new Error(`Progression state not found for user ${validatedId}`);
      }

      // If already completed on this date or idempotency key replay: return cached success with 0 new XP/HP
      if (existingCompletion) {
        return {
          status: 'ALREADY_PROCESSED',
          earnedXp: 0,
          earnedHp: 0,
          progression: {
            totalXp: currentState.totalXp,
            xpRemainder: currentState.xpRemainder,
            level: currentState.level,
            todayHp: currentState.todayHp,
            lifetimeHp: currentState.lifetimeHp,
            streakCount: currentState.streakCount,
            lastActiveDate: currentState.lastActiveDate
          },
          isDuplicate: true,
          message: 'Task already completed for this date or idempotency key previously processed'
        };
      }

      // 2. Handle Daily Rollover (Reset todayHP if active date has changed)
      let effectiveTodayHp = currentState.todayHp;
      if (currentState.lastActiveDate !== validated.completionDate) {
        effectiveTodayHp = 0;
      }

      // 3. Authoritative Reward Calculation (Server calculates XP & HP)
      const reward = calculateReward(currentState.level, effectiveTodayHp, validated.taskHp);
      const newTodayHp = effectiveTodayHp + validated.taskHp;
      const newLifetimeHp = currentState.lifetimeHp + validated.taskHp;

      // 4. Cumulative XP & Level Advancement
      const xpUpdate = addExperience(currentState.totalXp, currentState.xpRemainder, reward.earnedXP);
      const newLevel = getLevelForTotalXP(xpUpdate.newTotalXP);

      // 5. Query recent task history to compute deterministic streak
      const recentHistory = await tx.taskCompletion.findMany({
        where: { userId: validatedId },
        select: { completionDate: true },
        take: 365,
        orderBy: { completionDate: 'desc' }
      });

      const historyWithToday = [{ completionDate: validated.completionDate }, ...recentHistory];
      const newStreak = calculateCurrentStreak(historyWithToday, validated.completionDate);

      // 6. Record Task Completion in Anti-Duplication Ledger
      await tx.taskCompletion.create({
        data: {
          userId: validatedId,
          taskId: validated.taskId,
          completionDate: validated.completionDate,
          earnedXp: reward.earnedXP,
          earnedHp: validated.taskHp,
          idempotencyKey: validated.idempotencyKey
        }
      });

      // 7. Update Authoritative Progression State
      const updatedState = await tx.progressionState.update({
        where: { userId: validatedId },
        data: {
          totalXp: xpUpdate.newTotalXP,
          xpRemainder: xpUpdate.newRemainder,
          level: newLevel,
          todayHp: newTodayHp,
          lifetimeHp: newLifetimeHp,
          streakCount: newStreak,
          lastActiveDate: validated.completionDate,
          version: { increment: 1 }
        }
      });

      return {
        status: 'SUCCESS',
        earnedXp: reward.earnedXP,
        earnedHp: validated.taskHp,
        progression: {
          totalXp: updatedState.totalXp,
          xpRemainder: updatedState.xpRemainder,
          level: updatedState.level,
          todayHp: updatedState.todayHp,
          lifetimeHp: updatedState.lifetimeHp,
          streakCount: updatedState.streakCount,
          lastActiveDate: updatedState.lastActiveDate
        },
        isDuplicate: false
      };
    });
  }

  /**
   * Server-Authoritative Achievement Reward Claim.
   * 
   * Strict Invariants:
   * 1. Rewards XP scaled to user level.
   * 2. Strictly awards 0 HP (HP is daily habit currency only).
   * 3. Idempotent claim protection.
   */
  public async claimAchievementReward(
    userId: string,
    params: {
      achievementId: string;
      rarity: AchievementRarity;
      idempotencyKey: string;
    }
  ) {
    const validatedId = UUIDSchema.parse(userId);
    const validated = ClaimAchievementSchema.parse(params);

    return prisma.$transaction(async (tx) => {
      const currentState = await tx.progressionState.findUnique({
        where: { userId: validatedId }
      });

      if (!currentState) {
        throw new Error(`Progression state not found for user ${validatedId}`);
      }

      // Check or create achievement record
      let achievement = await tx.achievementProgress.findUnique({
        where: {
          unique_user_achievement: {
            userId: validatedId,
            achievementId: validated.achievementId
          }
        }
      });

      if (achievement && achievement.rewardClaimed) {
        return {
          status: 'ALREADY_CLAIMED',
          awardedXp: 0,
          awardedHp: 0,
          totalXp: currentState.totalXp,
          level: currentState.level
        };
      }

      // Calculate level-scaled XP reward (HP is strictly 0!)
      const awardedXp = calculateAchievementXpReward(validated.rarity, currentState.level);
      const awardedHp = 0; // Protected Invariant: 0 HP for achievements

      const xpUpdate = addExperience(currentState.totalXp, currentState.xpRemainder, awardedXp);
      const newLevel = getLevelForTotalXP(xpUpdate.newTotalXP);

      // Upsert achievement status
      await tx.achievementProgress.upsert({
        where: {
          unique_user_achievement: {
            userId: validatedId,
            achievementId: validated.achievementId
          }
        },
        update: {
          isUnlocked: true,
          unlockedAt: achievement?.unlockedAt ?? new Date(),
          rewardClaimed: true,
          rewardXpAwarded: awardedXp,
          rewardHpAwarded: 0,
          idempotencyKey: validated.idempotencyKey
        },
        create: {
          userId: validatedId,
          achievementId: validated.achievementId,
          isUnlocked: true,
          unlockedAt: new Date(),
          rewardClaimed: true,
          rewardXpAwarded: awardedXp,
          rewardHpAwarded: 0,
          idempotencyKey: validated.idempotencyKey
        }
      });

      // Update Progression
      const updatedState = await tx.progressionState.update({
        where: { userId: validatedId },
        data: {
          totalXp: xpUpdate.newTotalXP,
          xpRemainder: xpUpdate.newRemainder,
          level: newLevel,
          version: { increment: 1 }
        }
      });

      return {
        status: 'SUCCESS',
        awardedXp,
        awardedHp,
        totalXp: updatedState.totalXp,
        level: updatedState.level
      };
    });
  }
}

export const progressionService = new ProgressionService();
