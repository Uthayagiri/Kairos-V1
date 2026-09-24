export interface TaskCompletionRecord {
  taskId: string;
  taskTitle: string;
  hpAwarded: number;
  xpAwarded: number;
  completedAt: string; // ISO timestamp
  date: string;        // YYYY-MM-DD
}

export interface LevelUpRecord {
  level: number;
  levelTitle: string;
  unlockedAt: string;  // ISO timestamp
  totalXpAtUnlock: number;
}

export interface ProgressionState {
  totalXP: number;               // Cumulative lifetime integer XP
  xpRemainder: number;           // Fractional decimal XP in range [0.000000, 1.000000)
  level: number;                 // Current level 1–100
  todayHP: number;               // HP earned today (resets at midnight)
  lastActiveDate: string;        // YYYY-MM-DD of last activity
  lifetimeHP: number;            // Cumulative lifetime HP accumulated
  completedTaskIdsToday: string[]; // Set of task IDs completed today
  taskHistory: TaskCompletionRecord[];
  levelUpHistory: LevelUpRecord[];
  achievementRewardedIds?: string[]; // Set of achievement IDs whose progression XP reward was already awarded
}

export interface AchievementUnlockResult {
  success: boolean;
  alreadyAwarded: boolean;
  xpAwarded: number;
  hpAwarded: 0;
  previousLevel: number;
  newLevel: number;
  didLevelUp: boolean;
  newTotalXP: number;
  newXpRemainder: number;
}

export interface TaskCompletionResult {
  success: boolean;
  alreadyCompleted: boolean;
  hpAwarded: number;
  xpAwarded: number;
  preCapHP: number;
  postCapHP: number;
  previousLevel: number;
  newLevel: number;
  didLevelUp: boolean;
  newTotalXP: number;
  newXpRemainder: number;
  newTodayHP: number;
}

export interface DefaultTask {
  id: string;
  title: string;
  description: string;
  category: 'Routine' | 'Wellness' | 'Organization' | 'Intellect' | 'Fitness' | 'Reflection' | 'Skill' | 'Productivity' | 'Social' | 'Discipline';
  hp: number;
  recurrence: 'Daily';
  unlockLevel: number;
  priority: 'High' | 'Medium' | 'Low';
  schedule: string;
  startTime?: string;
  endTime?: string;
}

export interface LevelInfo {
  level: number;
  title: string;
  deltaXP: number;
  cumulativeXP: number;
  threshold: number;
  taskCount: number;
  milestoneDetails: string;
}

export interface LevelProgress {
  currentLevel: number;
  currentLevelTitle: string;
  nextLevel: number;
  nextLevelTitle: string;
  totalXP: number;
  xpRemainder: number;
  effectiveXP: number;
  currentLevelFloorXP: number;
  nextLevelTargetXP: number;
  xpIntoCurrentLevel: number;
  xpNeededForNextLevel: number;
  progressPercent: number;
}
