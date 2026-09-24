import { useState, useEffect, useCallback } from 'react';
import {
  ProgressionState,
  TaskCompletionResult,
  AchievementUnlockResult,
  DefaultTask,
  LevelProgress
} from '../types/progression.types';
import { progressionManager } from '../services/progressionManager';
import {
  getDailyHpThreshold,
  getDefaultTaskCount,
  getLevelTitle,
  calculateLevelProgress,
  calculateCurrentStreak
} from '../services/progressionEngine';
import { getUnlockedDefaultTasks } from '../data/defaultTasks';
import { AchievementRarity } from '../../achievements/types/achievement.types';

export interface UseProgressionResult {
  // Current user progression
  level: number;
  levelTitle: string;
  todayHP: number;
  dailyHpThreshold: number;
  totalXP: number;
  xpRemainder: number;
  effectiveXP: number;
  lifetimeHP: number;
  currentStreak: number;
  
  // Level advancement metrics
  progressPercent: number;
  currentLevelFloorXP: number;
  nextLevelTargetXP: number;
  xpIntoCurrentLevel: number;
  xpNeededForNextLevel: number;
  nextLevel: number;
  nextLevelTitle: string;

  // Task integration
  completedTaskIdsToday: string[];
  defaultTaskCount: number;
  unlockedDefaultTasks: DefaultTask[];
  
  // Actions
  isTaskCompletedToday: (taskId: string) => boolean;
  isTaskCompletedOnDate: (taskId: string, dateStr: string) => boolean;
  getTaskCompletionRecord: (taskId: string, dateStr?: string) => import('../types/progression.types').TaskCompletionRecord | undefined;
  completeTask: (task: { id: string; hp: number; title?: string }) => TaskCompletionResult;
  uncompleteTask: (taskId: string, hp: number) => boolean;
  awardAchievementUnlock: (payload: { id: string; rarity: AchievementRarity; title?: string }) => AchievementUnlockResult;
  isAchievementRewarded: (achievementId: string) => boolean;
  checkDailyRollover: () => boolean;
  checkWeeklyProgression: () => {
    level: number;
    levelTitle: string;
    defaultTaskCount: number;
    unlockedTasks: DefaultTask[];
    totalXP: number;
  };
  
  // Raw state & histories
  rawState: ProgressionState;
}

export function useProgression(): UseProgressionResult {
  const [state, setState] = useState<ProgressionState>(() => progressionManager.getState());

  useEffect(() => {
    // Subscribe to state changes across all components and windows
    const unsubscribe = progressionManager.subscribe((newState) => {
      setState(newState);
    });
    return () => unsubscribe();
  }, []);

  const isTaskCompletedToday = useCallback(
    (taskId: string) => {
      return state.completedTaskIdsToday.includes(taskId);
    },
    [state.completedTaskIdsToday]
  );

  const isTaskCompletedOnDate = useCallback(
    (taskId: string, dateStr: string) => {
      return progressionManager.isTaskCompletedOnDate(taskId, dateStr);
    },
    [state.completedTaskIdsToday, state.taskHistory]
  );

  const getTaskCompletionRecord = useCallback(
    (taskId: string, dateStr?: string) => {
      return progressionManager.getTaskCompletionRecord(taskId, dateStr);
    },
    [state.taskHistory]
  );

  const completeTask = useCallback(
    (task: { id: string; hp: number; title?: string }) => {
      return progressionManager.completeTask(task);
    },
    []
  );

  const uncompleteTask = useCallback(
    (taskId: string, hp: number) => {
      return progressionManager.uncompleteTask(taskId, hp);
    },
    []
  );

  const awardAchievementUnlock = useCallback(
    (payload: { id: string; rarity: AchievementRarity; title?: string }) => {
      return progressionManager.awardAchievementUnlock(payload);
    },
    []
  );

  const isAchievementRewarded = useCallback(
    (achievementId: string) => {
      return progressionManager.isAchievementRewarded(achievementId);
    },
    []
  );

  const checkDailyRollover = useCallback(() => {
    return progressionManager.checkDailyRollover();
  }, []);

  const checkWeeklyProgression = useCallback(() => {
    return progressionManager.checkWeeklyProgression();
  }, []);

  // Derived progression metrics
  const levelTitle = getLevelTitle(state.level);
  const dailyHpThreshold = getDailyHpThreshold(state.level);
  const defaultTaskCount = getDefaultTaskCount(state.level);
  const unlockedDefaultTasks = getUnlockedDefaultTasks(state.level);
  const levelProgress: LevelProgress = calculateLevelProgress(state.totalXP, state.level);
  const effectiveXP = Number((state.totalXP + state.xpRemainder).toFixed(6));

  return {
    level: state.level,
    levelTitle,
    todayHP: state.todayHP,
    dailyHpThreshold,
    totalXP: state.totalXP,
    xpRemainder: state.xpRemainder,
    effectiveXP,
    lifetimeHP: state.lifetimeHP,
    currentStreak: calculateCurrentStreak(state.taskHistory, state.lastActiveDate),
    
    progressPercent: levelProgress.progressPercent,
    currentLevelFloorXP: levelProgress.currentLevelFloorXP,
    nextLevelTargetXP: levelProgress.nextLevelTargetXP,
    xpIntoCurrentLevel: levelProgress.xpIntoCurrentLevel,
    xpNeededForNextLevel: levelProgress.xpNeededForNextLevel,
    nextLevel: levelProgress.nextLevel,
    nextLevelTitle: levelProgress.nextLevelTitle,

    completedTaskIdsToday: state.completedTaskIdsToday,
    defaultTaskCount,
    unlockedDefaultTasks,

    isTaskCompletedToday,
    isTaskCompletedOnDate,
    getTaskCompletionRecord,
    completeTask,
    uncompleteTask,
    awardAchievementUnlock,
    isAchievementRewarded,
    checkDailyRollover,
    checkWeeklyProgression,

    rawState: state
  };
}

