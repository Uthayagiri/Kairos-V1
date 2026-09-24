import {
  PROGRESSION_CONFIG,
  LEVEL_TITLES,
  LEVEL_DELTAS,
  CUMULATIVE_XP_TABLE,
  calculateDailyHpThreshold,
  calculateDefaultTaskCount,
  calculateDeltaXP
} from '../config/progressionConfig';
import { LevelProgress } from '../types/progression.types';

/**
 * Returns the Daily HP threshold for a given level.
 */
export function getDailyHpThreshold(level: number): number {
  return calculateDailyHpThreshold(level);
}

/**
 * Returns the count of unlocked default tasks for a given level.
 */
export function getDefaultTaskCount(level: number): number {
  return calculateDefaultTaskCount(level);
}

/**
 * Returns the ΔXP needed to advance from level-1 to level.
 */
export function getDeltaXPForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level <= PROGRESSION_CONFIG.maxLevel) {
    return LEVEL_DELTAS[level];
  }
  return calculateDeltaXP(level);
}

/**
 * Returns the cumulative total XP required to reach a given level.
 */
export function getCumulativeXPForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level <= PROGRESSION_CONFIG.maxLevel) {
    return CUMULATIVE_XP_TABLE[level];
  }
  return CUMULATIVE_XP_TABLE[PROGRESSION_CONFIG.maxLevel];
}

/**
 * Determines the user's level (1–100) based on their total whole XP.
 * Level 1: 0 XP
 * Level 2: 125 XP
 * ...
 * Level 100: 867,415+ XP
 */
export function getLevelForTotalXP(totalXP: number): number {
  if (totalXP <= 0) return 1;
  
  // Binary search or linear scan over 100 entries for exact level determination
  let currentLevel = 1;
  for (let lvl = 2; lvl <= PROGRESSION_CONFIG.maxLevel; lvl++) {
    if (totalXP >= CUMULATIVE_XP_TABLE[lvl]) {
      currentLevel = lvl;
    } else {
      break;
    }
  }
  return Math.min(PROGRESSION_CONFIG.maxLevel, currentLevel);
}

/**
 * Returns the unique title for a given level.
 */
export function getLevelTitle(level: number): string {
  const boundedLevel = Math.max(1, Math.min(PROGRESSION_CONFIG.maxLevel, level));
  return LEVEL_TITLES[boundedLevel - 1] || 'Initiate Flow';
}

/**
 * Calculates HP reward and XP conversion considering the circadian daily threshold.
 * 
 * Rules:
 * - Pre-cap portion: 1 HP = 1.0 XP
 * - Post-cap portion: 100 HP = 1.0 XP (0.01 XP per HP)
 * - Task crossing threshold is split into preCap and postCap
 * 
 * Returns exact floating point earnedXP without rounding down.
 */
export function calculateReward(
  currentLevel: number,
  todayHP: number,
  taskHP: number
): {
  preCapHP: number;
  postCapHP: number;
  earnedXP: number;
} {
  const threshold = getDailyHpThreshold(currentLevel);
  const cleanTaskHP = Math.max(0, taskHP);
  const currentTodayHP = Math.max(0, todayHP);

  if (currentTodayHP >= threshold) {
    // Entire task is above threshold
    const preCapHP = 0;
    const postCapHP = cleanTaskHP;
    const earnedXP = Number((postCapHP * 0.01).toFixed(6));
    return { preCapHP, postCapHP, earnedXP };
  }

  const hpSpace = threshold - currentTodayHP;

  if (cleanTaskHP <= hpSpace) {
    // Entire task is within threshold
    const preCapHP = cleanTaskHP;
    const postCapHP = 0;
    const earnedXP = preCapHP * 1.0;
    return { preCapHP, postCapHP, earnedXP };
  }

  // Task crosses the threshold: split into pre-cap and post-cap
  const preCapHP = hpSpace;
  const postCapHP = cleanTaskHP - hpSpace;
  const earnedXP = Number((preCapHP * 1.0 + postCapHP * 0.01).toFixed(6));

  return { preCapHP, postCapHP, earnedXP };
}

/**
 * Adds earned XP to the user's progression, preserving fractional XP remainder without loss.
 * Remainder is stored in the range [0.000000, 1.000000).
 */
export function addExperience(
  currentTotalXP: number,
  currentRemainder: number,
  earnedXP: number
): {
  newTotalXP: number;
  newRemainder: number;
  wholeGained: number;
} {
  const cleanRemainder = Math.max(0, Math.min(0.999999, currentRemainder || 0));
  const cleanEarned = Math.max(0, earnedXP || 0);

  const totalCombined = cleanRemainder + cleanEarned;
  const wholeGained = Math.floor(totalCombined);
  const newRemainder = Number((totalCombined - wholeGained).toFixed(6));
  const newTotalXP = Math.max(0, currentTotalXP + wholeGained);

  return {
    newTotalXP,
    newRemainder,
    wholeGained
  };
}

/**
 * Calculates comprehensive progress metrics for UI display.
 */
export function calculateLevelProgress(totalXP: number, explicitLevel?: number): LevelProgress {
  const currentLevel = explicitLevel ?? getLevelForTotalXP(totalXP);
  const currentLevelTitle = getLevelTitle(currentLevel);
  
  const isMaxLevel = currentLevel >= PROGRESSION_CONFIG.maxLevel;
  const nextLevel = isMaxLevel ? PROGRESSION_CONFIG.maxLevel : currentLevel + 1;
  const nextLevelTitle = getLevelTitle(nextLevel);

  const currentLevelFloorXP = CUMULATIVE_XP_TABLE[currentLevel];
  const nextLevelTargetXP = isMaxLevel ? currentLevelFloorXP : CUMULATIVE_XP_TABLE[nextLevel];
  const nextLevelDeltaXP = isMaxLevel ? 0 : LEVEL_DELTAS[nextLevel];

  const xpIntoCurrentLevel = Math.max(0, totalXP - currentLevelFloorXP);
  const xpNeededForNextLevel = isMaxLevel ? 0 : Math.max(0, nextLevelTargetXP - totalXP);
  
  let progressPercent = 100;
  if (!isMaxLevel && nextLevelDeltaXP > 0) {
    progressPercent = Math.min(100, Math.max(0, Math.round((xpIntoCurrentLevel / nextLevelDeltaXP) * 100)));
  }

  return {
    currentLevel,
    currentLevelTitle,
    nextLevel,
    nextLevelTitle,
    totalXP,
    xpRemainder: 0,
    effectiveXP: totalXP,
    currentLevelFloorXP,
    nextLevelTargetXP,
    xpIntoCurrentLevel,
    xpNeededForNextLevel,
    progressPercent
  };
}

/**
 * Calculates the user's current daily streak of consecutive active calendar days ending on today.
 * 
 * Deterministic Rules:
 * - A calendar day is an ACTIVE DAY if at least one qualifying task completion is recorded.
 * - Current streak is the count of consecutive active days ending on todayDateStr.
 * - If today has completed task recorded, streak counts backward starting from today.
 * - If today has no activity yet, checks if yesterday was active to maintain the ongoing unbroken streak.
 * - If neither today nor yesterday has activity, current streak is 0.
 * - Multiple task completions on the same date count as 1 active day.
 * - Future dates (> todayDateStr) are strictly ignored.
 * - Walks backward one local calendar day at a time until the first missing date.
 */
export function calculateCurrentStreak(
  taskHistory: Array<{ date?: string; completedAt?: string }>,
  todayDateStr: string
): number {
  if (!Array.isArray(taskHistory) || taskHistory.length === 0 || !todayDateStr) {
    return 0;
  }

  const activeDates = new Set<string>();

  for (const record of taskHistory) {
    if (!record) continue;
    let dateStr = record.date;
    if (!dateStr && typeof record.completedAt === 'string' && record.completedAt.length >= 10) {
      dateStr = record.completedAt.slice(0, 10);
    }
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      if (dateStr <= todayDateStr) {
        activeDates.add(dateStr);
      }
    }
  }

  // Determine starting point: today if active, otherwise yesterday (ongoing unbroken streak)
  let cursorStr = todayDateStr;
  if (!activeDates.has(todayDateStr)) {
    const [y, m, d] = todayDateStr.split('-').map((v) => parseInt(v, 10));
    if (isNaN(y) || isNaN(m) || isNaN(d)) return 0;

    const prevDate = new Date(y, m - 1, d);
    prevDate.setDate(prevDate.getDate() - 1);

    const prevYear = prevDate.getFullYear();
    const prevMonth = String(prevDate.getMonth() + 1).padStart(2, '0');
    const prevDay = String(prevDate.getDate()).padStart(2, '0');
    const yesterdayStr = `${prevYear}-${prevMonth}-${prevDay}`;

    if (!activeDates.has(yesterdayStr)) {
      return 0;
    }
    cursorStr = yesterdayStr;
  }

  let streak = 1;

  while (true) {
    const [y, m, d] = cursorStr.split('-').map((v) => parseInt(v, 10));
    if (isNaN(y) || isNaN(m) || isNaN(d)) break;

    const prevDate = new Date(y, m - 1, d);
    prevDate.setDate(prevDate.getDate() - 1);

    const prevYear = prevDate.getFullYear();
    const prevMonth = String(prevDate.getMonth() + 1).padStart(2, '0');
    const prevDay = String(prevDate.getDate()).padStart(2, '0');
    const prevDateStr = `${prevYear}-${prevMonth}-${prevDay}`;

    if (activeDates.has(prevDateStr)) {
      streak += 1;
      cursorStr = prevDateStr;
    } else {
      break;
    }
  }

  return streak;
}

