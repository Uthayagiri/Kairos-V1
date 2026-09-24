import {
  ProgressionState,
  TaskCompletionResult,
  AchievementUnlockResult,
  LevelProgress,
  DefaultTask
} from '../types/progression.types';
import {
  calculateReward,
  addExperience,
  getLevelForTotalXP,
  getLevelTitle,
  getDailyHpThreshold,
  getDefaultTaskCount,
  calculateLevelProgress,
  calculateCurrentStreak
} from './progressionEngine';
import { getUnlockedDefaultTasks } from '../data/defaultTasks';
import { AchievementRarity } from '../../achievements/types/achievement.types';
import { calculateAchievementXpReward } from '../../achievements/utils/achievementHelpers';
import {
  STORAGE_DOMAINS,
  getUserScopedJSON,
  setUserScopedJSON,
  getUserStorageKey,
  setActiveUserId
} from '../../storage';
import { syncQueue, syncSerializer } from '../../sync';

export const STORAGE_KEY = 'KAIROS_PROGRESSION_STATE_V1';
const UPDATE_EVENT = 'kairos_progression_updated';

/**
 * Returns the current date in local YYYY-MM-DD format.
 */
export function getLocalTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Creates the initial progression state for a brand-new user.
 */
function createInitialState(): ProgressionState {
  const today = getLocalTodayDateString();
  return {
    totalXP: 0,
    xpRemainder: 0.0,
    level: 1,
    todayHP: 0,
    lastActiveDate: today,
    lifetimeHP: 0,
    completedTaskIdsToday: [],
    taskHistory: [],
    levelUpHistory: [
      {
        level: 1,
        levelTitle: getLevelTitle(1),
        unlockedAt: new Date().toISOString(),
        totalXpAtUnlock: 0
      }
    ],
    achievementRewardedIds: []
  };
}

class ProgressionManager {
  private state: ProgressionState;
  private listeners: Set<(state: ProgressionState) => void> = new Set();
  private isInitialized = false;

  constructor() {
    this.state = this.loadState();
    this.setupWindowListeners();
  }

  private setupWindowListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        const activeKey = getUserStorageKey(STORAGE_DOMAINS.PROGRESSION);
        if ((event.key === activeKey || event.key === STORAGE_KEY) && event.newValue) {
          try {
            this.state = JSON.parse(event.newValue);
            this.notifyListeners();
          } catch {
            // ignore JSON parse error
          }
        }
      });

      // Daily rollover check on tab focus or resume
      window.addEventListener('focus', () => {
        this.checkDailyRollover();
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.checkDailyRollover();
        }
      });

      // Task timing and progression update events
      window.addEventListener('kairos_progression_updated', () => {
        this.notifyListeners();
      });
      window.addEventListener('kairos_task_timing_updated', () => {
        this.notifyListeners();
      });
    }
  }

  /**
   * Switches the active user context, loading their isolated progression state.
   */
  public switchUser(user?: string | { email?: string; id?: string; username?: string; name?: string } | null): void {
    if (user !== undefined) {
      setActiveUserId(user);
    }
    this.state = this.loadState();
    try {
      syncQueue.switchUser();
    } catch {}
    this.notifyListeners();
  }

  /**
   * Resets in-memory progression session to a clean initial state without deleting persisted data.
   */
  public resetSession(): void {
    this.state = createInitialState();
    this.notifyListeners();
  }

  /**
   * Loads state from user-scoped storage or creates fresh initial state.
   */
  private loadState(): ProgressionState {
    try {
      const stored = getUserScopedJSON<Partial<ProgressionState> | null>(STORAGE_DOMAINS.PROGRESSION, null);
      if (stored) {
        const today = getLocalTodayDateString();

        const state: ProgressionState = {
          totalXP: typeof stored.totalXP === 'number' ? stored.totalXP : 0,
          xpRemainder: typeof stored.xpRemainder === 'number' ? stored.xpRemainder : 0.0,
          level: typeof stored.level === 'number' && stored.level >= 1 ? stored.level : 1,
          todayHP: typeof stored.todayHP === 'number' ? stored.todayHP : 0,
          lastActiveDate: stored.lastActiveDate || today,
          lifetimeHP: typeof stored.lifetimeHP === 'number' ? stored.lifetimeHP : 0,
          completedTaskIdsToday: Array.isArray(stored.completedTaskIdsToday) ? stored.completedTaskIdsToday : [],
          taskHistory: Array.isArray(stored.taskHistory) ? stored.taskHistory : [],
          levelUpHistory: Array.isArray(stored.levelUpHistory) ? stored.levelUpHistory : [],
          achievementRewardedIds: Array.isArray(stored.achievementRewardedIds) ? stored.achievementRewardedIds : []
        };

        // Recalculate level from totalXP to guarantee integrity
        state.level = getLevelForTotalXP(state.totalXP);

        // Check if calendar date changed since last session
        if (state.lastActiveDate !== today) {
          state.todayHP = 0;
          state.completedTaskIdsToday = [];
          state.lastActiveDate = today;
          this.saveToStorage(state);
        }

        return state;
      }
    } catch (e) {
      console.warn('Failed to load Kairos progression state, creating initial:', e);
    }

    const initialState = createInitialState();
    this.saveToStorage(initialState);
    return initialState;
  }

  /**
   * Persists state to user-scoped storage.
   */
  private saveToStorage(state: ProgressionState) {
    try {
      setUserScopedJSON(STORAGE_DOMAINS.PROGRESSION, state);
    } catch (e) {
      console.warn('Failed to persist Kairos progression state:', e);
    }
  }

  /**
   * Dispatches state updates to all active listeners and CustomEvent subscribers.
   */
  private notifyListeners() {
    const currentState = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(currentState);
      } catch (err) {
        console.error('Error in progression listener:', err);
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(UPDATE_EVENT, { detail: currentState })
      );
    }
  }

  /**
   * Checks if the calendar day has rolled over to a new local date.
   */
  public checkDailyRollover(): boolean {
    const today = getLocalTodayDateString();
    if (this.state.lastActiveDate !== today) {
      this.state.todayHP = 0;
      this.state.completedTaskIdsToday = [];
      this.state.lastActiveDate = today;
      this.saveToStorage(this.state);
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Returns a snapshot of the current progression state.
   */
  public getState(): ProgressionState {
    this.checkDailyRollover();
    return { ...this.state };
  }

  /**
   * Returns LevelProgress metrics for UI display.
   */
  public getLevelProgress(): LevelProgress {
    const state = this.getState();
    const progress = calculateLevelProgress(state.totalXP, state.level);
    return {
      ...progress,
      xpRemainder: state.xpRemainder,
      effectiveXP: Number((state.totalXP + state.xpRemainder).toFixed(6))
    };
  }

  /**
   * Returns the user's current daily streak derived deterministically from task history.
   */
  public getCurrentStreak(customDateStr?: string): number {
    this.checkDailyRollover();
    const today = customDateStr || getLocalTodayDateString();
    return calculateCurrentStreak(this.state.taskHistory, today);
  }

  /**
   * Checks weekly progression status, validates level up status and default task count.
   */
  public checkWeeklyProgression(): {
    level: number;
    levelTitle: string;
    defaultTaskCount: number;
    unlockedTasks: DefaultTask[];
    totalXP: number;
  } {
    this.checkDailyRollover();
    const verifiedLevel = getLevelForTotalXP(this.state.totalXP);
    if (verifiedLevel !== this.state.level) {
      this.state.level = verifiedLevel;
      this.saveToStorage(this.state);
      this.notifyListeners();
    }
    return {
      level: this.state.level,
      levelTitle: getLevelTitle(this.state.level),
      defaultTaskCount: getDefaultTaskCount(this.state.level),
      unlockedTasks: getUnlockedDefaultTasks(this.state.level),
      totalXP: this.state.totalXP
    };
  }

  /**
   * Checks if a specific task has already been completed today.
   */
  public isTaskCompletedToday(taskId: string): boolean {
    this.checkDailyRollover();
    return this.state.completedTaskIdsToday.includes(taskId);
  }

  /**
   * Checks if a specific task was completed on a given calendar date (YYYY-MM-DD).
   * For today, checks completedTaskIdsToday. For other dates, checks taskHistory.
   */
  public isTaskCompletedOnDate(taskId: string, dateStr: string): boolean {
    this.checkDailyRollover();
    const today = getLocalTodayDateString();
    if (dateStr === today) {
      return this.state.completedTaskIdsToday.includes(taskId);
    }
    return this.state.taskHistory.some((r) => r.taskId === taskId && r.date === dateStr);
  }

  /**
   * Retrieves the task completion record for a specific date or latest recorded completion.
   */
  public getTaskCompletionRecord(taskId: string, dateStr?: string) {
    this.checkDailyRollover();
    if (dateStr) {
      return this.state.taskHistory.slice().reverse().find((r) => r.taskId === taskId && r.date === dateStr);
    }
    return this.state.taskHistory.slice().reverse().find((r) => r.taskId === taskId);
  }

  /**
   * Atomically completes a task, awards HP and XP, and checks for level-ups.
   * Fully idempotent: duplicate attempts on the same calendar day return alreadyCompleted: true.
   */
  public completeTask(task: {
    id: string;
    hp: number;
    title?: string;
  }): TaskCompletionResult {
    this.checkDailyRollover();

    const previousLevel = this.state.level;
    const taskHP = Math.max(0, task.hp || 0);
    const taskId = String(task.id);
    const taskTitle = task.title || taskId;

    // 1. Idempotency check: verify task hasn't already been completed today
    if (this.state.completedTaskIdsToday.includes(taskId)) {
      return {
        success: false,
        alreadyCompleted: true,
        hpAwarded: 0,
        xpAwarded: 0,
        preCapHP: 0,
        postCapHP: 0,
        previousLevel,
        newLevel: previousLevel,
        didLevelUp: false,
        newTotalXP: this.state.totalXP,
        newXpRemainder: this.state.xpRemainder,
        newTodayHP: this.state.todayHP
      };
    }

    // 2. Calculate HP reward and XP conversion considering daily threshold
    const { preCapHP, postCapHP, earnedXP } = calculateReward(
      this.state.level,
      this.state.todayHP,
      taskHP
    );

    // 3. Accumulate XP preserving exact fractional remainder
    const { newTotalXP, newRemainder } = addExperience(
      this.state.totalXP,
      this.state.xpRemainder,
      earnedXP
    );

    // 4. Determine new level
    const newLevel = getLevelForTotalXP(newTotalXP);
    const didLevelUp = newLevel > previousLevel;

    // 5. Update state
    this.state.totalXP = newTotalXP;
    this.state.xpRemainder = newRemainder;
    this.state.level = newLevel;
    this.state.todayHP += taskHP;
    this.state.lifetimeHP += taskHP;
    this.state.completedTaskIdsToday.push(taskId);

    // 6. Record task history
    const completionRecord = {
      taskId,
      taskTitle,
      hpAwarded: taskHP,
      xpAwarded: earnedXP,
      completedAt: new Date().toISOString(),
      date: this.state.lastActiveDate
    };
    this.state.taskHistory.push(completionRecord);

    // 7. Record level-up history if unlocked
    if (didLevelUp) {
      for (let lvl = previousLevel + 1; lvl <= newLevel; lvl++) {
        this.state.levelUpHistory.push({
          level: lvl,
          levelTitle: getLevelTitle(lvl),
          unlockedAt: new Date().toISOString(),
          totalXpAtUnlock: newTotalXP
        });
      }
    }

    // 8. Persist and notify
    this.saveToStorage(this.state);
    this.notifyListeners();

    // 9. Enqueue offline sync mutation (without sending client-calculated XP/HP totals)
    try {
      syncQueue.enqueue(
        'TASK_COMPLETED',
        syncSerializer.taskCompleted({
          taskId,
          completionDate: this.state.lastActiveDate,
          taskHp: taskHP
        })
      );
    } catch (err) {
      // Non-blocking offline queue
    }

    return {
      success: true,
      alreadyCompleted: false,
      hpAwarded: taskHP,
      xpAwarded: earnedXP,
      preCapHP,
      postCapHP,
      previousLevel,
      newLevel,
      didLevelUp,
      newTotalXP,
      newXpRemainder: newRemainder,
      newTodayHP: this.state.todayHP
    };
  }

  /**
   * Checks if an achievement's XP reward has already been granted.
   */
  public isAchievementRewarded(achievementId: string): boolean {
    if (!Array.isArray(this.state.achievementRewardedIds)) {
      return false;
    }
    return this.state.achievementRewardedIds.includes(achievementId);
  }

  /**
   * Awards level-scaled XP for unlocking an achievement.
   * Rules:
   * - Awards level-scaled XP based on user's current level at unlock and achievement rarity.
   * - Awards strictly 0 HP (never modifies todayHP or lifetimeHP).
   * - Strictly idempotent: if achievement ID is already recorded in achievementRewardedIds,
   *   awards 0 additional XP and returns alreadyAwarded: true.
   * - Handles level advancement and levelUpHistory via existing progression engine.
   * - Does NOT trigger recursive achievement updates.
   */
  public awardAchievementUnlock(payload: {
    id: string;
    rarity: AchievementRarity;
    title?: string;
  }): AchievementUnlockResult {
    this.checkDailyRollover();

    const achievementId = String(payload.id);
    const previousLevel = this.state.level;

    if (!Array.isArray(this.state.achievementRewardedIds)) {
      this.state.achievementRewardedIds = [];
    }

    // 1. Strict Idempotency Check: if reward was already granted, do not grant again
    if (this.state.achievementRewardedIds.includes(achievementId)) {
      return {
        success: false,
        alreadyAwarded: true,
        xpAwarded: 0,
        hpAwarded: 0,
        previousLevel,
        newLevel: previousLevel,
        didLevelUp: false,
        newTotalXP: this.state.totalXP,
        newXpRemainder: this.state.xpRemainder
      };
    }

    // 2. Calculate XP reward using user's current level at the moment of unlock
    const xpAwarded = calculateAchievementXpReward(payload.rarity, previousLevel);

    // 3. Accumulate XP using standard progression engine (preserves fractional remainder)
    const { newTotalXP, newRemainder } = addExperience(
      this.state.totalXP,
      this.state.xpRemainder,
      xpAwarded
    );

    // 4. Recalculate level
    const newLevel = getLevelForTotalXP(newTotalXP);
    const didLevelUp = newLevel > previousLevel;

    // 5. Update state (NOTE: todayHP and lifetimeHP remain strictly untouched)
    this.state.totalXP = newTotalXP;
    this.state.xpRemainder = newRemainder;
    this.state.level = newLevel;
    this.state.achievementRewardedIds.push(achievementId);

    // 6. Record level-up history if unlocked
    if (didLevelUp) {
      for (let lvl = previousLevel + 1; lvl <= newLevel; lvl++) {
        this.state.levelUpHistory.push({
          level: lvl,
          levelTitle: getLevelTitle(lvl),
          unlockedAt: new Date().toISOString(),
          totalXpAtUnlock: newTotalXP
        });
      }
    }

    // 7. Persist and notify
    this.saveToStorage(this.state);
    this.notifyListeners();

    // 8. Enqueue offline sync mutation
    try {
      syncQueue.enqueue(
        'ACHIEVEMENT_CLAIMED',
        syncSerializer.achievementClaimed({
          achievementId,
          rarity: payload.rarity
        })
      );
    } catch (err) {
      // Non-blocking offline queue
    }

    return {
      success: true,
      alreadyAwarded: false,
      xpAwarded,
      hpAwarded: 0,
      previousLevel,
      newLevel,
      didLevelUp,
      newTotalXP,
      newXpRemainder: newRemainder
    };
  }

  /**
   * Reverts a task completion if the user uncompletes it during the current day.
   */
  public uncompleteTask(taskId: string, taskHP: number): boolean {
    this.checkDailyRollover();

    const idx = this.state.completedTaskIdsToday.indexOf(taskId);
    if (idx === -1) {
      return false; // Task was not completed today
    }

    // Remove from today's completed list
    this.state.completedTaskIdsToday.splice(idx, 1);

    // Find the latest history record for this task to know exact XP awarded
    let awardedXP = 0;
    const historyIdx = this.state.taskHistory.slice().reverse().findIndex(r => r.taskId === taskId && r.date === this.state.lastActiveDate);
    if (historyIdx !== -1) {
      const realIndex = this.state.taskHistory.length - 1 - historyIdx;
      awardedXP = this.state.taskHistory[realIndex].xpAwarded;
      this.state.taskHistory.splice(realIndex, 1);
    } else {
      // Fallback estimate
      awardedXP = Math.min(taskHP, getDailyHpThreshold(this.state.level));
    }

    // Subtract HP
    this.state.todayHP = Math.max(0, this.state.todayHP - taskHP);
    this.state.lifetimeHP = Math.max(0, this.state.lifetimeHP - taskHP);

    // Subtract XP carefully
    const currentEffectiveXP = this.state.totalXP + this.state.xpRemainder;
    const newEffectiveXP = Math.max(0, currentEffectiveXP - awardedXP);
    this.state.totalXP = Math.floor(newEffectiveXP);
    this.state.xpRemainder = Number((newEffectiveXP - this.state.totalXP).toFixed(6));

    // Recalculate level
    this.state.level = getLevelForTotalXP(this.state.totalXP);

    this.saveToStorage(this.state);
    this.notifyListeners();

    // Enqueue offline sync mutation
    try {
      syncQueue.enqueue(
        'TASK_UNCOMPLETED',
        syncSerializer.taskUncompleted({
          taskId,
          taskHp: taskHP
        })
      );
    } catch (err) {
      // Non-blocking offline queue
    }

    return true;
  }

  /**
   * Subscribes to state updates. Returns unsubscribe function.
   */
  public subscribe(listener: (state: ProgressionState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Sets progression state directly (for testing / sync purposes).
   */
  public setStateForTesting(newState: Partial<ProgressionState>) {
    this.state = {
      ...this.state,
      ...newState,
      level: typeof newState.totalXP === 'number' ? getLevelForTotalXP(newState.totalXP) : (newState.level || this.state.level)
    };
    this.saveToStorage(this.state);
    this.notifyListeners();
  }

  /**
   * Resets progression to brand new user state.
   */
  public resetToDefault() {
    this.state = createInitialState();
    this.saveToStorage(this.state);
    this.notifyListeners();
  }
}

// Singleton progression manager instance
export const progressionManager = new ProgressionManager();
