import {
  STORAGE_DOMAINS,
  getUserScopedJSON,
  setUserScopedJSON,
  removeUserScopedItem
} from '../storage/userScopedStorage';
import { SyncOperation, DeadLetterOperation, SyncMeta } from './syncTypes';

const KEY_GLOBAL_DEVICE_ID = 'KAIROS_CLIENT_DEVICE_ID_V1';

/**
 * Returns or generates a persistent device UUID identifier.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      let deviceId = window.localStorage.getItem(KEY_GLOBAL_DEVICE_ID);
      if (!deviceId) {
        deviceId = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `device-${Math.random().toString(36).substring(2, 11)}-${Date.now()}`;
        window.localStorage.setItem(KEY_GLOBAL_DEVICE_ID, deviceId);
      }
      return deviceId;
    } catch {
      // Fallback
    }
  }
  return 'device-local-fallback-001';
}

/**
 * Loads pending sync queue for the active user partition.
 */
export function loadPendingQueue(): SyncOperation[] {
  try {
    const queue = getUserScopedJSON<SyncOperation[] | null>(STORAGE_DOMAINS.SYNC_QUEUE, null);
    if (Array.isArray(queue)) {
      return queue;
    }
  } catch (err) {
    console.warn('Failed to load user-scoped sync queue:', err);
  }
  return [];
}

/**
 * Persists pending sync queue for the active user partition.
 */
export function savePendingQueue(queue: SyncOperation[]): void {
  try {
    setUserScopedJSON(STORAGE_DOMAINS.SYNC_QUEUE, queue);
  } catch (err) {
    console.warn('Failed to persist user-scoped sync queue:', err);
  }
}

/**
 * Loads dead-letter failed operations for the active user partition.
 */
export function loadDeadLetterQueue(): DeadLetterOperation[] {
  try {
    const dlq = getUserScopedJSON<DeadLetterOperation[] | null>(STORAGE_DOMAINS.SYNC_DEAD_LETTER, null);
    if (Array.isArray(dlq)) {
      return dlq;
    }
  } catch (err) {
    console.warn('Failed to load dead-letter queue:', err);
  }
  return [];
}

/**
 * Persists dead-letter failed operations (capped at 50 to prevent unbounded growth).
 */
export function saveDeadLetterQueue(dlq: DeadLetterOperation[]): void {
  try {
    const capped = dlq.slice(-50);
    setUserScopedJSON(STORAGE_DOMAINS.SYNC_DEAD_LETTER, capped);
  } catch (err) {
    console.warn('Failed to persist dead-letter queue:', err);
  }
}

/**
 * Loads metadata (monotonic sequence counter, cursor version, last sync time).
 */
export function loadSyncMeta(): SyncMeta {
  try {
    const meta = getUserScopedJSON<Partial<SyncMeta> | null>(STORAGE_DOMAINS.SYNC_META, null);
    if (meta) {
      return {
        lastSequenceNumber: typeof meta.lastSequenceNumber === 'number' ? meta.lastSequenceNumber : 0,
        lastSyncServerTime: meta.lastSyncServerTime,
        lastSyncSuccess: meta.lastSyncSuccess,
        cursorVersion: meta.cursorVersion || 1,
        deviceId: meta.deviceId || getOrCreateDeviceId()
      };
    }
  } catch (err) {
    console.warn('Failed to load sync metadata:', err);
  }

  return {
    lastSequenceNumber: 0,
    deviceId: getOrCreateDeviceId()
  };
}

/**
 * Persists sync metadata.
 */
export function saveSyncMeta(meta: SyncMeta): void {
  try {
    setUserScopedJSON(STORAGE_DOMAINS.SYNC_META, meta);
  } catch (err) {
    console.warn('Failed to persist sync metadata:', err);
  }
}

/**
 * Clears sync data when purging an account partition.
 */
export function clearUserSyncStorage(): void {
  removeUserScopedItem(STORAGE_DOMAINS.SYNC_QUEUE);
  removeUserScopedItem(STORAGE_DOMAINS.SYNC_DEAD_LETTER);
  removeUserScopedItem(STORAGE_DOMAINS.SYNC_META);
}
