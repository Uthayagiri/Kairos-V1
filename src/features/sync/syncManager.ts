import { apiClient } from '../api/services/apiClient';
import { API_CONFIG } from '../api/config/apiConfig';
import { syncQueue } from './syncQueue';
import { connectivityManager } from './services/connectivityManager';
import { authSession } from '../auth/authSession';
import { getOrCreateDeviceId, loadSyncMeta, saveSyncMeta } from './syncStorage';
import {
  SyncBatchRequest,
  SyncBatchResponse,
  SyncManagerStatus,
  SyncOperation
} from './syncTypes';
import { progressionManager } from '../progression/services/progressionManager';
import { loadUserCustomTasks, saveUserCustomTasks } from '../progression/services/taskTimingService';
import { STORAGE_DOMAINS, setUserScopedJSON, getUserScopedJSON } from '../storage';
import { loadAchievementsForUser } from '../achievements/hooks/useAchievementProgress';

class SyncManager {
  private isSyncing = false;
  private syncTimeout: any = null;
  private consecutiveErrors = 0;
  private lastSyncTime: string | null = null;
  private lastError: string | null = null;
  private debounceTimer: any = null;
  private listeners: Set<(status: SyncManagerStatus) => void> = new Set();

  constructor() {
    this.setupTriggers();
  }

  private setupTriggers(): void {
    // 1. Trigger sync when connectivity changes to ONLINE
    connectivityManager.subscribe((state) => {
      if (state === 'ONLINE') {
        this.scheduleSync(500);
      }
    });

    // 2. Trigger sync when user logs in with new token
    authSession.subscribe((user, isAuthenticated) => {
      if (isAuthenticated) {
        this.scheduleSync(300);
      }
    });

    // 3. Trigger debounced sync when operations are enqueued
    syncQueue.subscribe(() => {
      if (connectivityManager.isOnline() && authSession.isAuthenticated()) {
        this.debounceEnqueueSync();
      }
    });
  }

  private debounceEnqueueSync(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.syncNow();
    }, 500);
  }

  /**
   * Schedules a sync execution after specified delay in ms.
   */
  public scheduleSync(delayMs = 0): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    this.syncTimeout = setTimeout(() => {
      this.syncNow();
    }, delayMs);
  }

  /**
   * Primary Synchronization Execution.
   * 
   * Flow:
   * 1. Validates preconditions (not already syncing, online, authenticated).
   * 2. Peeks up to 100 pending operations from the user's queue.
   * 3. Transmits batch to POST /api/v1/sync/batch.
   * 4. Dequeues APPLIED & ALREADY_APPLIED mutations; records dead letters for permanent failures.
   * 5. Reconciles authoritative server snapshot with local progression.
   */
  public async syncNow(): Promise<{ success: boolean; reason?: string; processedCount?: number }> {
    if (this.isSyncing) {
      return { success: false, reason: 'ALREADY_SYNCING' };
    }

    const pendingCount = syncQueue.getPendingCount();
    if (pendingCount === 0) {
      return { success: true, processedCount: 0 };
    }

    // Connectivity guard
    const isOnline = await connectivityManager.checkBackendConnectivity();
    if (!isOnline) {
      return { success: false, reason: 'BACKEND_OFFLINE' };
    }

    // Authentication guard: if no active token, sync stays offline pending login
    if (!authSession.getAccessToken()) {
      return { success: false, reason: 'AUTHENTICATION_REQUIRED' };
    }

    this.isSyncing = true;
    connectivityManager.setSyncing(true);
    this.notify();

    const batch = syncQueue.peek(100);
    const deviceId = getOrCreateDeviceId();

    const batchPayload: SyncBatchRequest = {
      deviceId,
      operations: batch.map((op) => ({
        operationId: op.operationId,
        sequence: op.sequence,
        type: op.type,
        occurredAt: op.occurredAt,
        payload: op.payload
      }))
    };

    try {
      // Send batch to backend
      const response = await apiClient.post<SyncBatchResponse>(
        API_CONFIG.ENDPOINTS.SYNC_BATCH,
        batchPayload,
        { timeout: 15000 }
      );

      // Handle Individual Operation Results
      const successfulIds: string[] = [];
      const failedRetryIds: string[] = [];

      response.results.forEach((res) => {
        const matchingOp = batch.find((op) => op.operationId === res.operationId);

        if (res.status === 'APPLIED' || res.status === 'ALREADY_APPLIED') {
          successfulIds.push(res.operationId);
        } else if (res.code === 'VALIDATION_ERROR' || res.code === 'INVALID_OPERATION') {
          if (matchingOp) {
            syncQueue.moveToDeadLetter(matchingOp, res.error || 'Permanent validation error', res.code);
          }
        } else {
          failedRetryIds.push(res.operationId);
        }
      });

      // Dequeue successful operations
      syncQueue.dequeue(successfulIds);

      // Increment retry counter for transiently failed items
      syncQueue.incrementRetry(failedRetryIds);

      // Reconcile Authoritative Server Snapshots
      this.reconcileServerSnapshots(response.snapshots);

      // Update sync metadata
      const meta = loadSyncMeta();
      meta.lastSyncServerTime = response.serverTime;
      meta.lastSyncSuccess = true;
      meta.cursorVersion = response.cursorVersion;
      saveSyncMeta(meta);

      this.consecutiveErrors = 0;
      this.lastSyncTime = new Date().toISOString();
      this.lastError = null;

      // If more items remain in queue, schedule next batch immediately
      if (syncQueue.getPendingCount() > 0) {
        setTimeout(() => this.syncNow(), 200);
      }

      return { success: true, processedCount: successfulIds.length };
    } catch (err: any) {
      this.consecutiveErrors += 1;
      this.lastError = err.message || 'Sync transmission failed';

      // Schedule exponential backoff retry (max 60s)
      const baseDelay = Math.min(60000, Math.pow(2, this.consecutiveErrors) * 1000);
      const jitter = Math.floor(Math.random() * 500);
      const retryDelay = Math.min(60000, baseDelay + jitter);

      this.scheduleSync(retryDelay);

      return { success: false, reason: this.lastError || undefined };
    } finally {
      this.isSyncing = false;
      connectivityManager.setSyncing(false);
      this.notify();
    }
  }

  /**
   * Reconciles authoritative server state into local managers.
   */
  private reconcileServerSnapshots(snapshots: SyncBatchResponse['snapshots']): void {
    if (!snapshots) return;

    // 1. Reconcile Progression Snapshot (Server is strictly authoritative for XP/HP totals)
    if (snapshots.progression) {
      const serverProg = snapshots.progression;
      const currentLocal = progressionManager.getState();

      // Only update if server state has advanced or differs
      if (
        serverProg.totalXp !== currentLocal.totalXP ||
        serverProg.level !== currentLocal.level ||
        serverProg.todayHp !== currentLocal.todayHP
      ) {
        progressionManager.setStateForTesting({
          totalXP: serverProg.totalXp,
          xpRemainder: serverProg.xpRemainder ?? 0,
          level: serverProg.level,
          todayHP: serverProg.todayHp,
          lifetimeHP: serverProg.lifetimeHp ?? currentLocal.lifetimeHP,
          lastActiveDate: serverProg.lastActiveDate || currentLocal.lastActiveDate
        });
      }
    }

    // 2. Reconcile Tasks Snapshot (Merge/Sync server tasks with local custom tasks)
    if (Array.isArray(snapshots.tasks)) {
      try {
        const localCustoms = loadUserCustomTasks<any>();
        const localMap = new Map(localCustoms.map((t) => [t.id, t]));
        let hasChanges = false;

        snapshots.tasks.forEach((serverTask: any) => {
          if (!serverTask || !serverTask.taskId) return;
          const isCustom = serverTask.isCustom || String(serverTask.taskId).startsWith('custom-');
          if (!isCustom) return;

          const local = localMap.get(serverTask.taskId);
          if (!local) {
            localCustoms.push({
              id: serverTask.taskId,
              title: serverTask.title,
              description: serverTask.description || 'Custom user mission.',
              category: serverTask.category || 'Gym',
              hp: serverTask.targetHp || 20,
              status: serverTask.status || 'pending',
              priority: serverTask.priority || 'Medium',
              startTime: serverTask.startTime || '14:30',
              endTime: serverTask.endTime || '15:30',
              startDate: serverTask.startDate || new Date().toISOString().split('T')[0],
              endDate: serverTask.endDate || new Date().toISOString().split('T')[0],
              schedule: serverTask.schedule || 'Single Event / No Repeat',
              createdAt: serverTask.createdAt || 'Custom Mission',
              completedAt: serverTask.completedAt || null
            });
            hasChanges = true;
          } else {
            // Update existing status if changed on server
            if (serverTask.status && serverTask.status !== local.status) {
              local.status = serverTask.status;
              local.completedAt = serverTask.completedAt || local.completedAt;
              hasChanges = true;
            }
          }
        });

        if (hasChanges) {
          saveUserCustomTasks(localCustoms);
        }
      } catch (err) {
        console.warn('Failed to reconcile tasks snapshot:', err);
      }
    }

    // 3. Reconcile Achievements Snapshot
    if (Array.isArray((snapshots as any).achievements)) {
      try {
        const serverAchs = (snapshots as any).achievements;
        const serverMap = new Map<string, any>(serverAchs.map((a: any) => [a.achievementId, a]));
        const localAchs = loadAchievementsForUser();
        let achChanges = false;

        const updated = localAchs.map((ach) => {
          const s = serverMap.get(ach.id);
          if (s) {
            const isUnlocked = Boolean(s.unlocked);
            if (isUnlocked !== ach.unlocked || s.currentProgress !== ach.currentProgress) {
              achChanges = true;
              return {
                ...ach,
                currentProgress: typeof s.currentProgress === 'number' ? s.currentProgress : ach.currentProgress,
                unlocked: isUnlocked,
                isUnlocked: isUnlocked,
                unlockDate: isUnlocked ? (s.unlockedAt ? new Date(s.unlockedAt).toLocaleDateString() : 'Unlocked') : undefined,
                glowStage: isUnlocked ? 'UNLOCKED' : ach.glowStage
              };
            }
          }
          return ach;
        });

        if (achChanges) {
          setUserScopedJSON(STORAGE_DOMAINS.ACHIEVEMENTS, updated);
        }
      } catch (err) {
        console.warn('Failed to reconcile achievements snapshot:', err);
      }
    }

    // 4. Reconcile Profile Snapshot
    if ((snapshots as any).profile) {
      try {
        const p = (snapshots as any).profile;
        const currentExt = getUserScopedJSON<any>(STORAGE_DOMAINS.PROFILE_EXTENSION, {});
        const updatedExt = {
          ...currentExt,
          customName: p.name || currentExt.customName,
          kairosId: p.handle || currentExt.kairosId,
          userQuote: p.quote || currentExt.userQuote,
          avatarUrl: p.avatarUrl !== undefined ? p.avatarUrl : currentExt.avatarUrl
        };
        setUserScopedJSON(STORAGE_DOMAINS.PROFILE_EXTENSION, updatedExt);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('kairos_user_profile_updated', {
              detail: {
                id: p.userId,
                name: p.name,
                avatarUrl: p.avatarUrl,
                profile: p
              }
            })
          );
        }
      } catch (err) {
        console.warn('Failed to reconcile profile snapshot:', err);
      }
    }
  }

  /**
   * Authoritative Initial State Pull from Backend (PostgreSQL)
   * Fetches full application state on login / startup splash.
   */
  public async pullInitialState(): Promise<{ success: boolean; data?: any; reason?: string }> {
    if (!authSession.getAccessToken()) {
      return { success: false, reason: 'AUTHENTICATION_REQUIRED' };
    }

    try {
      const res = await apiClient.get<any>(API_CONFIG.ENDPOINTS.SYNC_STATE);
      if (res && res.snapshots) {
        this.reconcileServerSnapshots(res.snapshots);
        return { success: true, data: res.snapshots };
      }
    } catch (err: any) {
      console.warn('Failed to pull initial state from server:', err);
    }
    return { success: false };
  }

  /**
   * Resets sync manager state when switching user partitions.
   */
  public switchUser(): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }
    this.isSyncing = false;
    this.consecutiveErrors = 0;
    this.lastError = null;
    syncQueue.switchUser();
    this.notify();
  }

  public getStatus(): SyncManagerStatus {
    return {
      isOnline: connectivityManager.isOnline(),
      isSyncing: this.isSyncing,
      pendingCount: syncQueue.getPendingCount(),
      deadLetterCount: syncQueue.getDeadLetterCount(),
      lastSyncTime: this.lastSyncTime,
      lastError: this.lastError
    };
  }

  public subscribe(listener: (status: SyncManagerStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const status = this.getStatus();
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (err) {
        console.error('Error in sync manager status listener:', err);
      }
    });
  }
}

export const syncManager = new SyncManager();
