import { useState, useEffect, useMemo, useCallback } from 'react';
import { Achievement, FilterState, AchievementCategory, AchievementRarity, GlowStage } from '../types/achievement.types';
import { INITIAL_ACHIEVEMENTS } from '../data/achievements';
import { filterAchievements, getAchievementStats, getProgressRatio } from '../utils/achievementHelpers';

const STORAGE_KEY = 'kairos_achievements_state_v2';

export function useAchievementProgress() {
  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load achievements from localStorage', e);
    }
    return INITIAL_ACHIEVEMENTS;
  });

  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    category: 'all',
    rarity: 'all',
    status: 'all',
    sortBy: 'progress'
  });

  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [unlockedForCelebration, setUnlockedForCelebration] = useState<Achievement | null>(null);

  // Persist to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(achievements));
    } catch (e) {
      console.warn('Failed to save achievements to localStorage', e);
    }
  }, [achievements]);

  // Filtered achievements
  const filteredAchievements = useMemo(() => {
    return filterAchievements(achievements, filters);
  }, [achievements, filters]);

  // Aggregate stats
  const stats = useMemo(() => {
    return getAchievementStats(achievements);
  }, [achievements]);

  // Filter handlers
  const setSearchQuery = useCallback((searchQuery: string) => {
    setFilters((prev) => ({ ...prev, searchQuery }));
  }, []);

  const setCategory = useCallback((category: AchievementCategory) => {
    setFilters((prev) => ({ ...prev, category }));
  }, []);

  const setRarity = useCallback((rarity: AchievementRarity | 'all') => {
    setFilters((prev) => ({ ...prev, rarity }));
  }, []);

  const setStatus = useCallback((status: 'all' | 'unlocked' | 'in-progress' | 'locked') => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const setSortBy = useCallback((sortBy: 'progress' | 'rarity' | 'xp' | 'hp' | 'recent') => {
    setFilters((prev) => ({ ...prev, sortBy }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      searchQuery: '',
      category: 'all',
      rarity: 'all',
      status: 'all',
      sortBy: 'progress'
    });
  }, []);

  // Unlock an achievement
  const unlockAchievement = useCallback((id: string) => {
    setAchievements((prev) => {
      let target: Achievement | null = null;
      const updated = prev.map((item) => {
        if (item.id === id && !(item.unlocked || item.isUnlocked)) {
          target = {
            ...item,
            unlocked: true,
            isUnlocked: true,
            unlockDate: 'Just now',
            glowStage: 'UNLOCKED' as GlowStage,
            currentProgress: item.targetProgress
          };
          return target;
        }
        return item;
      });

      if (target) {
        setUnlockedForCelebration(target);
      }
      return updated;
    });
  }, []);

  // Increment progress on an achievement
  const incrementProgress = useCallback((id: string, amount: number = 1) => {
    setAchievements((prev) => {
      let targetToUnlock: Achievement | null = null;
      const updated = prev.map((item) => {
        if (item.id === id) {
          const newCurrent = Math.min(item.targetProgress, item.currentProgress + amount);
          const shouldUnlock = newCurrent >= item.targetProgress && !(item.unlocked || item.isUnlocked);
          const ratio = item.targetProgress > 0 ? newCurrent / item.targetProgress : 0;

          let newStage: GlowStage = 'LOCKED';
          if (shouldUnlock || item.unlocked) {
            newStage = 'UNLOCKED';
          } else if (ratio >= 0.75) {
            newStage = 'NEAR_COMPLETION';
          } else if (ratio > 0.25) {
            newStage = 'IN_PROGRESS';
          } else if (ratio > 0) {
            newStage = 'DISCOVERED';
          }

          const updatedItem: Achievement = {
            ...item,
            currentProgress: newCurrent,
            unlocked: item.unlocked || shouldUnlock,
            isUnlocked: item.isUnlocked || shouldUnlock,
            unlockDate: shouldUnlock ? 'Just now' : item.unlockDate,
            glowStage: newStage
          };

          if (shouldUnlock) {
            targetToUnlock = updatedItem;
          }
          return updatedItem;
        }
        return item;
      });

      if (targetToUnlock) {
        setUnlockedForCelebration(targetToUnlock);
      }
      return updated;
    });
  }, []);

  const closeCelebration = useCallback(() => {
    setUnlockedForCelebration(null);
  }, []);

  return {
    achievements,
    filteredAchievements,
    stats,
    filters,
    selectedAchievement,
    setSelectedAchievement,
    unlockedForCelebration,
    closeCelebration,
    setSearchQuery,
    setCategory,
    setRarity,
    setStatus,
    setSortBy,
    resetFilters,
    unlockAchievement,
    incrementProgress
  };
}
