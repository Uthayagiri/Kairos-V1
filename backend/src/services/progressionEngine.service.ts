/**
 * Kairos Server-Side Progression Engine
 * 
 * Strict implementation of the 100-Level Kairos Progression Curve & Circadian Invariants.
 * Ported directly from KAIROS_PROGRESSION_SPEC.md & src/features/progression/services/progressionEngine.ts
 */

export const PROGRESSION_CONFIG = {
  minLevel: 1,
  maxLevel: 100,
  baseDailyThreshold: 100,           // Threshold for Levels 1–4 (100 HP)
  thresholdInterval: 5,              // Interval for threshold increase (every 5 levels)
  thresholdIncreasePer5Levels: 15,   // +15 HP increase per milestone
  postThresholdConversionRatio: 100, // 100 HP = 1 XP (0.01 multiplier)
  baseDefaultTaskCount: 10,          // 10 initial default tasks at Level 1
  taskUnlockInterval: 5,             // 1 task unlocked every 5 levels
  maxDefaultTasks: 30                // Exactly 30 default tasks at Level 100
} as const;

export const LEVEL_TITLES: readonly string[] = [
  // Epoch 1 (1-10): Foundation & Routine
  "Initiate Flow", "Awakened Spark", "Rhythm Seeker", "Habit Novice", "Habit Apprentice",
  "Routine Builder", "Diurnal Walker", "Focus Neophyte", "Clarity Seeker", "Habit Practitioner",
  // Epoch 2 (11-20): Discipline & Rhythm
  "Steadfast Scholar", "Willpower Forge", "Pacing Adept", "Dawn Strider", "Focus Alchemist",
  "Consistency Sentinel", "Cognitive Artisan", "Rhythm Warden", "Momentum Trainee", "Momentum Navigator",
  // Epoch 3 (21-30): Momentum & Kinetic Flow
  "Kinetic Dynamo", "Flow Initiate", "Flow Catalyst", "Action Architect", "Habit Vanguard",
  "Velocity Adept", "Drive Harmonizer", "Tenacity Pathfinder", "Dynamic Pacer", "Momentum Sovereign",
  // Epoch 4 (31-40): Focus & Deep Craft
  "Deep Work Aspirant", "Singular Aim", "Attention Artisan", "Clarity Sentinel", "Distraction Slayer",
  "Precision Craftsman", "Intentionalist", "Cognitive Alchemist", "Mental Fortress", "Master of Focus",
  // Epoch 5 (41-50): Mastery & Self-Authorship
  "Self-Author Initiate", "Principle Guide", "Efficiency Virtuoso", "Method Maestro", "Intrinsic Dynamo",
  "Strategic Practitioner", "Excellence Weaver", "Sovereign Thinker", "Life Sculptor", "Grand Alchemist of Habit",
  // Epoch 6 (51-60): Resilience & Fortitude
  "Stoic Resilient", "Grit Pathfinder", "Iron Will", "Adaptation Specialist", "Equilibrium Keeper",
  "Unshakable Core", "Pressure Artisan", "Adversity Transmuter", "Tenacity Sovereign", "Fortress of Fortitude",
  // Epoch 7 (61-70): Leadership & Purpose
  "Purpose Architect", "Beacon of Rhythm", "Inspirational Guide", "Vision Harmonizer", "Cultural Catalyst",
  "Strategic Visionary", "Empathy Sovereign", "Synergy Conductor", "Guiding Luminary", "Epoch Master",
  // Epoch 8 (71-80): Wisdom & Equilibrium
  "Philosophic Sage", "Equanimity Seeker", "Insight Adept", "Reflective Anchor", "Mindful Sovereign",
  "Balance Architect", "Cognitive Luminary", "Quiet Storm", "Deep Perspective", "Sage of Equilibrium",
  // Epoch 9 (81-90): Harmony & Cosmic Perspective
  "Holistic Integrator", "Universal Pacer", "Temporal Strategist", "Zenith Voyager", "Flow Celestial",
  "Living Chronos", "Elysian Architect", "Timeless Sovereign", "Astral Luminary", "Ascendant Sovereign",
  // Epoch 10 (91-100): Transcendence & Pinnacle
  "Cosmic Weaver", "Chronos Vanguard", "Primordial Focus", "Solar Sovereign", "Universal Sentinel",
  "Omni Rhythm", "Infinite Flow", "Kairos Sovereign", "Apex Transcendence", "Aion Prime: The Kairos Omniscient"
];

/**
 * Formula calculating the XP delta required to advance from Level L-1 to Level L.
 * ΔXP(L) = round5( 80 + 45*(L-1) + 2.40*(L-1)^1.95 )
 */
export function calculateDeltaXP(level: number): number {
  if (level <= 1) return 0;
  const raw = 80 + 45 * (level - 1) + 2.40 * Math.pow(level - 1, 1.95);
  return Math.round(raw / 5) * 5;
}

/**
 * Formula calculating the daily HP threshold for a given level.
 * dailyHpThreshold(level) = baseDailyThreshold + floor(level / 5) * 15
 */
export function calculateDailyHpThreshold(level: number): number {
  const boundedLevel = Math.max(PROGRESSION_CONFIG.minLevel, Math.min(PROGRESSION_CONFIG.maxLevel, level));
  return (
    PROGRESSION_CONFIG.baseDailyThreshold +
    Math.floor(boundedLevel / PROGRESSION_CONFIG.thresholdInterval) * PROGRESSION_CONFIG.thresholdIncreasePer5Levels
  );
}

// Pre-computed 100-level lookup tables for O(1) operations
export const LEVEL_DELTAS: readonly number[] = (() => {
  const deltas: number[] = [0];
  for (let lvl = 1; lvl <= PROGRESSION_CONFIG.maxLevel; lvl++) {
    deltas.push(calculateDeltaXP(lvl));
  }
  return deltas;
})();

export const CUMULATIVE_XP_TABLE: readonly number[] = (() => {
  const cumulative: number[] = [0];
  let sum = 0;
  for (let lvl = 1; lvl <= PROGRESSION_CONFIG.maxLevel; lvl++) {
    sum += calculateDeltaXP(lvl);
    cumulative.push(sum);
  }
  return cumulative;
})();

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
 */
export function getLevelForTotalXP(totalXP: number): number {
  if (totalXP <= 0) return 1;

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
 * Invariants:
 * - Pre-cap portion: 1 HP = 1.0 XP
 * - Post-cap portion: 100 HP = 1.0 XP (0.01 XP per HP)
 * - Task crossing threshold is split into preCap and postCap
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
  const threshold = calculateDailyHpThreshold(currentLevel);
  const cleanTaskHP = Math.max(0, taskHP);
  const currentTodayHP = Math.max(0, todayHP);

  if (currentTodayHP >= threshold) {
    const preCapHP = 0;
    const postCapHP = cleanTaskHP;
    const earnedXP = Number((postCapHP * 0.01).toFixed(6));
    return { preCapHP, postCapHP, earnedXP };
  }

  const hpSpace = threshold - currentTodayHP;

  if (cleanTaskHP <= hpSpace) {
    const preCapHP = cleanTaskHP;
    const postCapHP = 0;
    const earnedXP = preCapHP * 1.0;
    return { preCapHP, postCapHP, earnedXP };
  }

  const preCapHP = hpSpace;
  const postCapHP = cleanTaskHP - hpSpace;
  const earnedXP = Number((preCapHP * 1.0 + postCapHP * 0.01).toFixed(6));

  return { preCapHP, postCapHP, earnedXP };
}

/**
 * Adds earned XP to the user's progression, preserving fractional XP remainder without loss.
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

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export const ACHIEVEMENT_RARITY_XP_PERCENTAGES: Record<AchievementRarity, number> = {
  common: 0.05,    // 5%
  uncommon: 0.075, // 7.5%
  rare: 0.10,      // 10%
  epic: 0.15,      // 15%
  legendary: 0.20, // 20%
  mythic: 0.25     // 25%
};

/**
 * Calculates level-scaled XP reward for an achievement based on its rarity and user level.
 * Invariants:
 * - Achievements award strictly 0 HP.
 * - Minimum reward is 1 XP.
 */
export function calculateAchievementXpReward(rarity: AchievementRarity, currentLevel: number): number {
  const safeLevel = typeof currentLevel === 'number' && currentLevel >= 1 ? Math.floor(currentLevel) : 1;
  const targetLevel = safeLevel >= 100 ? 100 : Math.max(2, safeLevel + 1);
  const deltaXP = LEVEL_DELTAS[targetLevel] || 80;
  const percentage = ACHIEVEMENT_RARITY_XP_PERCENTAGES[rarity] ?? ACHIEVEMENT_RARITY_XP_PERCENTAGES.common;
  return Math.max(1, Math.round(deltaXP * percentage));
}

/**
 * Calculates the user's current unbroken daily streak.
 */
export function calculateCurrentStreak(
  taskHistory: Array<{ date?: string; completionDate?: string; completedAt?: Date | string }>,
  todayDateStr: string
): number {
  if (!Array.isArray(taskHistory) || taskHistory.length === 0 || !todayDateStr) {
    return 0;
  }

  const activeDates = new Set<string>();

  for (const record of taskHistory) {
    if (!record) continue;
    let dateStr = record.date || record.completionDate;
    if (!dateStr && record.completedAt) {
      const iso = typeof record.completedAt === 'string' ? record.completedAt : record.completedAt.toISOString();
      dateStr = iso.slice(0, 10);
    }
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      if (dateStr <= todayDateStr) {
        activeDates.add(dateStr);
      }
    }
  }

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
      streak++;
      cursorStr = prevDateStr;
    } else {
      break;
    }
  }

  return streak;
}
