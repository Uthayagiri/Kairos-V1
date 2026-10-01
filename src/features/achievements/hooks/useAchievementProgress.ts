import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Achievement, FilterState, AchievementCategory, AchievementRarity, GlowStage } from '../types/achievement.types';
import { INITIAL_ACHIEVEMENTS } from '../data/achievements';
import {
  filterAchievements,
  getAchievementStats,
  evaluateAchievementsFromProgression
} from '../utils/achievementHelpers';
import { progressionManager } from '../../progression/services/progressionManager';
import {
  STORAGE_DOMAINS,
  getUserScopedJSON,
  setUserScopedJSON,
  UserIdentifier
} from '../../storage';

export const STORAGE_KEY = 'kairos_achievements_state_v6';

export function loadAchievementsForUser(userId?: UserIdentifier): Achievement[] {
  try {
    const parsed = getUserScopedJSON<Achievement[] | null>(STORAGE_DOMAINS.ACHIEVEMENTS, null, userId);
    if (parsed && Array.isArray(parsed)) {
      return INITIAL_ACHIEVEMENTS.map((initial) => {
        const match = parsed.find((p) => p.id === initial.id);
        if (match) {
          const isUnlocked = Boolean(match.unlocked || match.isUnlocked);
          return {
            ...initial,
            rewardHP: 0,
            currentProgress: typeof match.currentProgress === 'number' ? match.currentProgress : 0,
            unlocked: isUnlocked,
            isUnlocked: isUnlocked,
            unlockDate: isUnlocked ? (match.unlockDate || undefined) : undefined,
            glowStage: match.glowStage || (isUnlocked ? 'UNLOCKED' : 'LOCKED')
          };
        }
        return {
          ...initial,
          rewardHP: 0,
          currentProgress: 0,
          unlocked: false,
          isUnlocked: false,
          glowStage: 'LOCKED'
        };
      });
    }
  } catch (e) {
    console.warn('Failed to load achievements from userScopedStorage', e);
  }
  return INITIAL_ACHIEVEMENTS.map(a => ({
    ...a,
    rewardHP: 0,
    currentProgress: 0,
    unlocked: false,
    isUnlocked: false,
    glowStage: 'LOCKED'
  }));
}

export function useAchievementProgress(userProfile?: UserIdentifier) {
  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    return loadAchievementsForUser(userProfile);
  });
  const isInitialMount = useRef(true);
  const skipNextSave = useRef(false);
  const userProfileRef = useRef(userProfile);
  userProfileRef.current = userProfile;

  // Sync state on user profile change
  useEffect(() => {
    skipNextSave.current = true;
    const initialLoaded = loadAchievementsForUser(userProfile);
    const state = progressionManager.getState();
    const streakCount = progressionManager.getCurrentStreak();
    const { updatedAchievements, newlyUnlocked } = evaluateAchievementsFromProgression(initialLoaded, {
      streakCount,
      level: state.level,
      totalXP: state.totalXP,
      lifetimeHP: state.lifetimeHP,
      taskHistory: state.taskHistory
    });

    if (newlyUnlocked.length > 0) {
      newlyUnlocked.forEach((ach) => {
        progressionManager.awardAchievementUnlock({
          id: ach.id,
          rarity: ach.rarity,
          title: ach.name || ach.title
        });
      });
    }

    setAchievements(updatedAchievements);
  }, [userProfile]);

  // Synchronize achievement milestones with live progression events
  useEffect(() => {
    const handleProgressionSync = () => {
      const state = progressionManager.getState();
      const streakCount = progressionManager.getCurrentStreak();
      setAchievements((prev) => {
        const { updatedAchievements, newlyUnlocked } = evaluateAchievementsFromProgression(prev, {
          streakCount,
          level: state.level,
          totalXP: state.totalXP,
          lifetimeHP: state.lifetimeHP,
          taskHistory: state.taskHistory
        });

        if (newlyUnlocked.length > 0) {
          newlyUnlocked.forEach((ach) => {
            progressionManager.awardAchievementUnlock({
              id: ach.id,
              rarity: ach.rarity,
              title: ach.name || ach.title
            });
          });
          setUnlockedForCelebration((current) => current || newlyUnlocked[0]);
        }

        return updatedAchievements;
      });
    };

    const unsubscribe = progressionManager.subscribe(() => {
      handleProgressionSync();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    category: 'all',
    rarity: 'all',
    status: 'all',
    sortBy: 'progress'
  });

  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [unlockedForCelebration, setUnlockedForCelebration] = useState<Achievement | null>(null);

  // Persist to user scoped storage only on progress mutations, avoiding writes during hydration
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    try {
      setUserScopedJSON(STORAGE_DOMAINS.ACHIEVEMENTS, achievements, userProfileRef.current);
    } catch (e) {
      console.warn('Failed to save achievements to userScopedStorage', e);
    }
  }, [achievements]);

  // Filtered achievements
  const filteredAchievements = useMemo(() => {
    return filterAchievements(achievements, filters);
  }, [achievements, filters]);

  // Aggregate stats using current user level for accurate level-scaled rewards
  const stats = useMemo(() => {
    const currentLevel = progressionManager.getState().level;
    return getAchievementStats(achievements, currentLevel);
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
            rewardHP: 0,
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
        // Award level-scaled XP via ProgressionManager (strictly idempotent, 0 HP)
        progressionManager.awardAchievementUnlock({
          id: (target as Achievement).id,
          rarity: (target as Achievement).rarity,
          title: (target as Achievement).name || (target as Achievement).title
        });
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
            rewardHP: 0,
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
        // Award level-scaled XP via ProgressionManager (strictly idempotent, 0 HP)
        progressionManager.awardAchievementUnlock({
          id: (targetToUnlock as Achievement).id,
          rarity: (targetToUnlock as Achievement).rarity,
          title: (targetToUnlock as Achievement).name || (targetToUnlock as Achievement).title
        });
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
