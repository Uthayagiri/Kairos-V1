import { Achievement, FilterState } from '../types/achievement.types';

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
        return getProgressPercentage(b) - getProgressPercentage(a);
      }
      if (filters.sortBy === 'xp') {
        return (b.rewardXP || 0) - (a.rewardXP || 0);
      }
      if (filters.sortBy === 'hp') {
        return (b.rewardHP || 0) - (a.rewardHP || 0);
      }
      if (filters.sortBy === 'rarity') {
        const rarityWeights = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, mythic: 6 };
        return rarityWeights[b.rarity] - rarityWeights[a.rarity];
      }
      // Recent (unlocked first)
      if (isAUnlocked && !isBUnlocked) return -1;
      if (!isAUnlocked && isBUnlocked) return 1;
      return 0;
    });
}

/**
 * Aggregates statistics for the user's achievements catalogue
 */
export function getAchievementStats(achievements: Achievement[]) {
  const total = achievements.length;
  const unlocked = achievements.filter((a) => a.unlocked || a.isUnlocked).length;
  const totalHpAvailable = achievements.reduce((acc, a) => acc + (a.rewardHP || 0), 0);
  const earnedHp = achievements
    .filter((a) => a.unlocked || a.isUnlocked)
    .reduce((acc, a) => acc + (a.rewardHP || 0), 0);
  const totalXpAvailable = achievements.reduce((acc, a) => acc + (a.rewardXP || 0), 0);
  const earnedXp = achievements
    .filter((a) => a.unlocked || a.isUnlocked)
    .reduce((acc, a) => acc + (a.rewardXP || 0), 0);
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
