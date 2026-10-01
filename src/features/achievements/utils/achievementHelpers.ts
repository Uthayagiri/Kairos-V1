import { Achievement, FilterState, AchievementRarity, GlowStage } from '../types/achievement.types';
import { getDeltaXPForLevel } from '../../progression/services/progressionEngine';

export const ACHIEVEMENT_RARITY_XP_PERCENTAGES: Record<AchievementRarity, number> = {
  common: 0.05,      // 5%
  uncommon: 0.075,   // 7.5%
  rare: 0.10,        // 10%
  epic: 0.15,        // 15%
  legendary: 0.20,   // 20%
  mythic: 0.25       // 25%
};

/**
 * Calculates level-scaled XP reward for an achievement based on its rarity and the user's level at unlock.
 * Rules:
 * - currentLevel < 100 -> uses ΔXP needed for currentLevel + 1
 * - currentLevel >= 100 -> uses ΔXP for Level 100 (capped)
 * - Minimum reward is 1 XP.
 * - Achievements award 0 HP.
 */
export function calculateAchievementXpReward(rarity: AchievementRarity, currentLevel: number): number {
  const safeLevel = typeof currentLevel === 'number' && currentLevel >= 1 ? Math.floor(currentLevel) : 1;
  const targetLevel = safeLevel >= 100 ? 100 : Math.max(2, safeLevel + 1);
  const deltaXP = getDeltaXPForLevel(targetLevel);
  const percentage = ACHIEVEMENT_RARITY_XP_PERCENTAGES[rarity] ?? ACHIEVEMENT_RARITY_XP_PERCENTAGES.common;
  return Math.max(1, Math.round(deltaXP * percentage));
}

/**
 * Calculates progress percentage (0 - 100)
 */
export function getProgressPercentage(achievement: Achievement): number {
  if (achievement.unlocked || achievement.isUnlocked) return 100;
  if (!achievement.targetProgress || achievement.targetProgress === 0) return 0;
  const pct = (achievement.currentProgress / achievement.targetProgress) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

/**
 * Calculates progress ratio (0.0 - 1.0)
 */
export function getProgressRatio(achievement: Achievement): number {
  if (achievement.unlocked || achievement.isUnlocked) return 1.0;
  if (!achievement.targetProgress || achievement.targetProgress === 0) return 0.0;
  return Math.min(1.0, Math.max(0.0, achievement.currentProgress / achievement.targetProgress));
}

/**
 * Filters and sorts an array of achievements according to FilterState
 */
export function filterAchievements(
  achievements: Achievement[],
  filters: FilterState
): Achievement[] {
  return achievements
    .filter((ach) => {
      const isUnlocked = ach.unlocked || ach.isUnlocked || false;
      const progressRatio = getProgressRatio(ach);

      // 1. Search Query
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchesName = (ach.name || ach.title || '').toLowerCase().includes(query);
        const matchesDesc = ach.description.toLowerCase().includes(query);
        const matchesCategory = ach.category.toLowerCase().includes(query);
        const matchesRarity = ach.rarity.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesCategory && !matchesRarity) {
          return false;
        }
      }

      // 2. Category
      if (filters.category !== 'all' && ach.category !== filters.category) {
        return false;
      }

      // 3. Rarity
      if (filters.rarity !== 'all' && ach.rarity !== filters.rarity) {
        return false;
      }

      // 4. Status Filter
      if (filters.status === 'unlocked' && !isUnlocked) return false;
      if (filters.status === 'locked' && isUnlocked) return false;
      if (filters.status === 'in-progress' && (isUnlocked || progressRatio <= 0)) return false;

      return true;
    })
    .sort((a, b) => {
      const isAUnlocked = a.unlocked || a.isUnlocked || false;
      const isBUnlocked = b.unlocked || b.isUnlocked || false;

      if (filters.sortBy === 'progress') {
        if (a.seriesTitle && b.seriesTitle && a.seriesTitle === b.seriesTitle) {
          return a.tier - b.tier;
        }
        return (a.tier || 1) - (b.tier || 1);
      }
      if (filters.sortBy === 'xp') {
        return (b.rewardXP || 0) - (a.rewardXP || 0);
      }
      if (filters.sortBy === 'hp') {
        return (b.rewardHP || 0) - (a.rewardHP || 0);
      }
      if (filters.sortBy === 'rarity') {
        const rarityWeights = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, mythic: 6 };
        return rarityWeights[a.rarity] - rarityWeights[b.rarity];
      }
      // Recent (unlocked first)
      if (isAUnlocked && !isBUnlocked) return -1;
      if (!isAUnlocked && isBUnlocked) return 1;
      return a.tier - b.tier;
    });
}

/**
 * Aggregates statistics for the user's achievements catalogue.
 * Strictly guarantees 0 HP from achievements and reflects level-scaled XP.
 */
export function getAchievementStats(achievements: Achievement[], currentLevel: number = 1) {
  const total = achievements.length;
  const unlocked = achievements.filter((a) => a.unlocked || a.isUnlocked).length;
  const totalHpAvailable = 0;
  const earnedHp = 0;
  const totalXpAvailable = achievements.reduce(
    (acc, a) => acc + calculateAchievementXpReward(a.rarity, currentLevel),
    0
  );
  const earnedXp = achievements
    .filter((a) => a.unlocked || a.isUnlocked)
    .reduce((acc, a) => acc + calculateAchievementXpReward(a.rarity, currentLevel), 0);
  const completionPercentage = total > 0 ? Math.round((unlocked / total) * 100) : 0;

  return {
    total,
    unlocked,
    locked: total - unlocked,
    totalHpAvailable,
    earnedHp,
    totalXpAvailable,
    earnedXp,
    completionPercentage
  };
}

export interface ProgressionEvaluationContext {
  streakCount: number;
  level: number;
  totalXP: number;
  lifetimeHP: number;
  taskHistory?: Array<{ taskId: string; date?: string; completedAt?: string; hpAwarded?: number }>;
  focusSessionsCount?: number;
  hasCustomizedProfile?: boolean;
}

/**
 * Derives and synchronizes achievement progress from authoritative progression data.
 */
export function evaluateAchievementsFromProgression(
  achievements: Achievement[],
  context: ProgressionEvaluationContext
): { updatedAchievements: Achievement[]; newlyUnlocked: Achievement[] } {
  const history = context.taskHistory || [];
  const completedTasksCount = history.length;
  const uniqueDates = new Set(history.map((h) => h.date || h.completedAt?.slice(0, 10)).filter(Boolean));
  const activeDaysCount = Math.max(uniqueDates.size, context.streakCount > 0 ? context.streakCount : 0);

  const taskCountByDay = new Map<string, number>();
  history.forEach((h) => {
    const day = h.date || h.completedAt?.slice(0, 10);
    if (day) {
      taskCountByDay.set(day, (taskCountByDay.get(day) || 0) + 1);
    }
  });
  let perfectDaysCount = 0;
  taskCountByDay.forEach((count) => {
    if (count >= 3) perfectDaysCount++;
  });

  const newlyUnlocked: Achievement[] = [];

  const updatedAchievements = achievements.map((ach) => {
    const wasUnlocked = Boolean(ach.unlocked || ach.isUnlocked);
    let progress = typeof ach.currentProgress === 'number' ? ach.currentProgress : 0;

    switch (ach.category) {
      case 'streak':
        progress = Math.max(progress, context.streakCount);
        break;
      case 'task-mastery':
        progress = Math.max(progress, completedTasksCount);
        break;
      case 'level-milestones':
        progress = Math.max(progress, context.level);
        break;
      case 'loyalty':
        progress = Math.max(progress, activeDaysCount);
        break;
      case 'perfect-performance':
        progress = Math.max(progress, perfectDaysCount);
        break;
      case 'lifetime':
        progress = Math.max(progress, context.lifetimeHP);
        break;
      case 'challenge':
        if (context.focusSessionsCount !== undefined) {
          progress = Math.max(progress, context.focusSessionsCount);
        }
        break;
      case 'ai-companion':
        if (context.hasCustomizedProfile) {
          progress = Math.max(progress, 1);
        }
        break;
      default:
        break;
    }

    const target = ach.targetProgress || 1;
    const clampedProgress = Math.min(target, Math.max(0, progress));
    const isNowUnlocked = wasUnlocked || clampedProgress >= target;
    const ratio = target > 0 ? clampedProgress / target : 0;

    let glowStage: GlowStage = ach.glowStage || 'LOCKED';
    if (isNowUnlocked) {
      glowStage = 'UNLOCKED';
    } else if (ratio >= 0.75) {
      glowStage = 'NEAR_COMPLETION';
    } else if (ratio > 0.25) {
      glowStage = 'IN_PROGRESS';
    } else if (ratio > 0) {
      glowStage = 'DISCOVERED';
    }

    const updated: Achievement = {
      ...ach,
      rewardHP: 0,
      currentProgress: isNowUnlocked ? target : clampedProgress,
      unlocked: isNowUnlocked,
      isUnlocked: isNowUnlocked,
      unlockDate: isNowUnlocked ? (ach.unlockDate || 'Just now') : undefined,
      glowStage
    };

    if (!wasUnlocked && isNowUnlocked) {
      newlyUnlocked.push(updated);
    }

    return updated;
  });

  return { updatedAchievements, newlyUnlocked };
}

