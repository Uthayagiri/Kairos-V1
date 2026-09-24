import { LevelInfo } from '../types/progression.types';

export const PROGRESSION_CONFIG = {
  minLevel: 1,
  maxLevel: 100,
  baseDailyThreshold: 100,           // Threshold for Levels 1–4 (100 HP)
  thresholdInterval: 5,              // Interval for threshold increase (every 5 levels)
  thresholdIncreasePer5Levels: 15,   // +15 HP increase per milestone
  postThresholdConversionRatio: 100, // 100 HP = 1 XP (0.01 multiplier)
  baseDefaultTaskCount: 10,          // 10 initial default tasks at Level 1
  taskUnlockInterval: 5,             // 1 task unlocked every 5 levels
  maxDefaultTasks: 30,               // Exactly 30 default tasks at Level 100
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
 * Pure formula calculating the XP delta required to advance from Level L-1 to Level L.
 * ΔXP(L) = round5( 80 + 45*(L-1) + 2.40*(L-1)^1.95 )
 */
export function calculateDeltaXP(level: number): number {
  if (level <= 1) return 0;
  const raw = 80 + 45 * (level - 1) + 2.40 * Math.pow(level - 1, 1.95);
  return Math.round(raw / 5) * 5;
}

/**
 * Pure formula calculating the daily HP threshold for a given level.
 * dailyHpThreshold(level) = baseDailyThreshold + floor(level / 5) * 15
 */
export function calculateDailyHpThreshold(level: number): number {
  const boundedLevel = Math.max(PROGRESSION_CONFIG.minLevel, Math.min(PROGRESSION_CONFIG.maxLevel, level));
  return PROGRESSION_CONFIG.baseDailyThreshold + Math.floor(boundedLevel / PROGRESSION_CONFIG.thresholdInterval) * PROGRESSION_CONFIG.thresholdIncreasePer5Levels;
}

/**
 * Pure formula calculating the number of unlocked default tasks for a given level.
 * First 5 levels (1–5) have strictly 10 default tasks, then increases by 1 task every 5 levels:
 * - Levels 1–5: 10 tasks
 * - Levels 6–10: 11 tasks
 * - Levels 11–15: 12 tasks
 * ...
 * - Level 100: 30 tasks
 * defaultTaskCount(level) = 10 + floor((level - 1) / 5)
 */
export function calculateDefaultTaskCount(level: number): number {
  const boundedLevel = Math.max(PROGRESSION_CONFIG.minLevel, Math.min(PROGRESSION_CONFIG.maxLevel, level));
  if (boundedLevel >= PROGRESSION_CONFIG.maxLevel) {
    return PROGRESSION_CONFIG.maxDefaultTasks;
  }
  return Math.min(
    PROGRESSION_CONFIG.maxDefaultTasks,
    PROGRESSION_CONFIG.baseDefaultTaskCount + Math.floor((boundedLevel - 1) / PROGRESSION_CONFIG.taskUnlockInterval)
  );
}

// Pre-compute 100-level lookup tables for maximum O(1) performance
export const LEVEL_DELTAS: readonly number[] = (() => {
  const deltas: number[] = [0]; // index 0 unused, index 1 = Level 1 (0 XP)
  for (let lvl = 1; lvl <= PROGRESSION_CONFIG.maxLevel; lvl++) {
    deltas.push(calculateDeltaXP(lvl));
  }
  return deltas;
})();

export const CUMULATIVE_XP_TABLE: readonly number[] = (() => {
  const cumulative: number[] = [0]; // index 0 unused, index 1 = Level 1 (0 XP)
  let sum = 0;
  for (let lvl = 1; lvl <= PROGRESSION_CONFIG.maxLevel; lvl++) {
    sum += calculateDeltaXP(lvl);
    cumulative.push(sum);
  }
  return cumulative;
})();

export const LEVEL_INFO_TABLE: readonly LevelInfo[] = (() => {
  const table: LevelInfo[] = [];
  for (let lvl = 1; lvl <= PROGRESSION_CONFIG.maxLevel; lvl++) {
    const deltaXP = LEVEL_DELTAS[lvl];
    const cumulativeXP = CUMULATIVE_XP_TABLE[lvl];
    const threshold = calculateDailyHpThreshold(lvl);
    const taskCount = calculateDefaultTaskCount(lvl);
    const title = LEVEL_TITLES[lvl - 1];

    let milestoneDetails = '-';
    if (lvl === 1) {
      milestoneDetails = 'Starting Tier • 10 Initial Tasks • Cap 100 HP';
    } else if (lvl % 5 === 0) {
      milestoneDetails = `⭐ Milestone: Unlock Task ${taskCount} • Cap ${threshold} HP`;
    }

    table.push({
      level: lvl,
      title,
      deltaXP,
      cumulativeXP,
      threshold,
      taskCount,
      milestoneDetails
    });
  }
  return table;
})();
