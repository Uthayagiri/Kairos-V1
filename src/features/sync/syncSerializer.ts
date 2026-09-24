import { SyncOperationType } from './syncTypes';

/**
 * Kairos Sync Payload Serializer
 * 
 * Prepares and sanitizes domain payloads for server synchronization.
 * 
 * Strict Invariants:
 * 1. Never sends client-calculated `earnedXp`, `earnedHp`, `level`, `totalXp`.
 * 2. Never sends passwords, password hashes, or token secrets.
 * 3. Enforces standard naming and data formats expected by backend Phase E.3/E.4 schemas.
 */

export const syncSerializer = {
  taskCreated(params: {
    taskId: string;
    title: string;
    category?: string;
    targetHp?: number;
    startTime?: string;
    endTime?: string;
    durationMinutes?: number;
    isCustom?: boolean;
  }) {
    return {
      taskId: String(params.taskId),
      title: String(params.title),
      category: params.category || 'focus',
      targetHp: typeof params.targetHp === 'number' ? params.targetHp : 15,
      startTime: params.startTime,
      endTime: params.endTime,
      durationMinutes: params.durationMinutes,
      isCustom: params.isCustom !== undefined ? params.isCustom : true
    };
  },

  taskUpdated(params: {
    taskId: string;
    title?: string;
    category?: string;
    targetHp?: number;
    startTime?: string;
    endTime?: string;
    durationMinutes?: number;
  }) {
    return {
      taskId: String(params.taskId),
      title: params.title,
      category: params.category,
      targetHp: params.targetHp,
      startTime: params.startTime,
      endTime: params.endTime,
      durationMinutes: params.durationMinutes
    };
  },

  taskDeleted(params: { taskId: string }) {
    return {
      taskId: String(params.taskId)
    };
  },

  taskCompleted(params: { taskId: string; completionDate: string; taskHp?: number }) {
    return {
      taskId: String(params.taskId),
      completionDate: String(params.completionDate),
      taskHp: typeof params.taskHp === 'number' ? params.taskHp : 15
    };
  },

  taskUncompleted(params: { taskId: string; taskHp?: number }) {
    return {
      taskId: String(params.taskId),
      taskHp: typeof params.taskHp === 'number' ? params.taskHp : 15
    };
  },

  achievementClaimed(params: { achievementId: string; rarity: string }) {
    return {
      achievementId: String(params.achievementId),
      rarity: String(params.rarity).toLowerCase()
    };
  },

  focusSessionRecorded(params: {
    sessionId: string;
    title: string;
    durationSeconds: number;
    targetDurationMinutes: number;
    startedAt: string;
    completedAt: string;
    category?: string;
    flowScore?: number;
    rating?: number;
    notes?: string;
  }) {
    return {
      sessionId: String(params.sessionId),
      title: String(params.title || 'Focus Session'),
      category: params.category || 'deep_work',
      durationSeconds: Math.max(0, Math.round(params.durationSeconds)),
      targetDurationMinutes: Math.max(1, Math.round(params.targetDurationMinutes)),
      startedAt: params.startedAt,
      completedAt: params.completedAt,
      flowScore: params.flowScore,
      rating: params.rating,
      notes: params.notes
    };
  },

  dailyReflectionUpserted(params: {
    date: string;
    mood?: string;
    energyScore?: number;
    focusRating?: number;
    wins?: any;
    journalText?: string;
  }) {
    return {
      date: String(params.date),
      mood: params.mood,
      energyScore: params.energyScore,
      focusRating: params.focusRating,
      wins: params.wins,
      journalText: params.journalText
    };
  },

  profileUpdated(params: {
    name?: string;
    handle?: string;
    bio?: string;
    quote?: string;
    timezone?: string;
    circadianType?: string;
    avatarUrl?: string;
    bannerTheme?: string;
  }) {
    return {
      name: params.name,
      handle: params.handle,
      bio: params.bio,
      quote: params.quote,
      timezone: params.timezone,
      circadianType: params.circadianType,
      avatarUrl: params.avatarUrl,
      bannerTheme: params.bannerTheme
    };
  },

  squadChallengeContribution(params: {
    challengeId: string;
    contributionUnits?: number;
    category?: string;
  }) {
    return {
      challengeId: String(params.challengeId),
      contributionUnits: params.contributionUnits || 1,
      category: params.category || 'general'
    };
  }
};
