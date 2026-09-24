/**
 * Kairos Offline-First Synchronization Types (Phase E.5)
 */

export type SyncOperationType =
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_DELETED'
  | 'TASK_COMPLETED'
  | 'TASK_UNCOMPLETED'
  | 'ACHIEVEMENT_CLAIMED'
  | 'FOCUS_SESSION_RECORDED'
  | 'DAILY_REFLECTION_UPSERTED'
  | 'PROFILE_UPDATED'
  | 'SQUAD_CHALLENGE_CONTRIBUTION';

export interface SyncOperation {
  operationId: string;
  sequence: number;
  type: SyncOperationType;
  occurredAt: string;
  payload: Record<string, any>;
  retryCount: number;
  lastAttemptAt?: string;
}

export interface DeadLetterOperation {
  operationId: string;
  type: SyncOperationType;
  payloadSummary: string;
  failedAt: string;
  errorCode: string;
  errorMessage: string;
  retryCount: number;
}

export interface SyncMeta {
  lastSequenceNumber: number;
  lastSyncServerTime?: string;
  lastSyncSuccess?: boolean;
  cursorVersion?: number;
  deviceId: string;
}

export interface SyncBatchRequest {
  deviceId: string;
  operations: Array<{
    operationId: string;
    sequence: number;
    type: SyncOperationType;
    occurredAt: string;
    payload?: any;
  }>;
}

export type SyncResultStatus = 'APPLIED' | 'ALREADY_APPLIED' | 'REJECTED' | 'CONFLICT';

export interface SyncOperationResult {
  operationId: string;
  status: SyncResultStatus;
  code: string;
  error?: string;
}

export interface SyncBatchResponse {
  success: boolean;
  serverTime: string;
  cursorVersion: number;
  results: SyncOperationResult[];
  snapshots: {
    progression?: {
      totalXp: number;
      xpRemainder: number;
      level: number;
      todayHp: number;
      lifetimeHp: number;
      streakCount: number;
      lastActiveDate: string;
    } | null;
    tasks?: any[] | null;
    achievements?: any[] | null;
  };
}

export interface SyncManagerStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  deadLetterCount: number;
  lastSyncTime: string | null;
  lastError: string | null;
}
