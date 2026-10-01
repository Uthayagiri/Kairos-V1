/**
 * Kairos User-Scoped Storage System
 * 
 * Provides deterministic, isolated local storage partitioning per authenticated user.
 * Ensures User A and User B maintain completely distinct state across all domains.
 */

export const STORAGE_DOMAINS = {
  PROGRESSION: 'PROGRESSION_STATE_V1',
  CUSTOM_TASKS: 'USER_CUSTOM_TASKS_V1',
  TASK_TIMING: 'TASK_TIMING_SETTINGS_V1',
  FOCUS_SESSIONS: 'FOCUS_SESSIONS_V1',
  ACHIEVEMENTS: 'ACHIEVEMENTS_STATE_V6',
  SQUAD_STATE: 'SQUAD_STATE_V1',
  SQUAD_LEGACY_CHALLENGES: 'SQUAD_CHALLENGES_V1',
  NOTIFICATIONS: 'NOTIFICATIONS_V1',
  NOTIFICATION_PREFERENCES: 'NOTIFICATION_PREFERENCES_V1',
  PINNED_REMINDER: 'PINNED_REMINDER_V1',
  DAILY_REFLECTIONS: 'DAILY_REFLECTIONS_V1',
  PROFILE_EXTENSION: 'USER_PROFILE_EXT_V1',
  DOWNTIME_SETTINGS: 'DOWNTIME_SETTINGS_V1',
  APPS_USAGE: 'APPS_USAGE_V1',
  HOURLY_TIMELINE: 'HOURLY_TIMELINE_V1',
  APP_FOCUS_LIMITS: 'APP_FOCUS_LIMITS_V1',
  BREAK_INTERVALS: 'BREAK_INTERVALS_V1',
  COMPANION_CHAT: 'COMPANION_CHAT_V1',
  SYNC_QUEUE: 'SYNC_QUEUE_V1',
  SYNC_DEAD_LETTER: 'SYNC_DEAD_LETTER_V1',
  SYNC_META: 'SYNC_META_V1',
  CONNECTIONS: 'CONNECTIONS_STATE_V1',
  INCOMING_REQUESTS: 'INCOMING_REQUESTS_V1',
  OUTGOING_REQUESTS: 'OUTGOING_REQUESTS_V1',
  SETTINGS_PREFERENCES: 'SETTINGS_PREFERENCES_V1'
} as const;

export type StorageDomainKey = (typeof STORAGE_DOMAINS)[keyof typeof STORAGE_DOMAINS] | string;

export const KEY_ACTIVE_USER_ID = 'KAIROS_ACTIVE_USER_ID_V1';
export const KEY_LEGACY_MIGRATION_CLAIMED = 'KAIROS_LEGACY_MIGRATION_CLAIMED_BY_V1';

export const LEGACY_GLOBAL_KEYS: Record<string, string> = {
  [STORAGE_DOMAINS.PROGRESSION]: 'KAIROS_PROGRESSION_STATE_V1',
  [STORAGE_DOMAINS.CUSTOM_TASKS]: 'KAIROS_USER_CUSTOM_TASKS_V1',
  [STORAGE_DOMAINS.TASK_TIMING]: 'KAIROS_TASK_TIMING_SETTINGS_V1',
  [STORAGE_DOMAINS.FOCUS_SESSIONS]: 'KAIROS_FOCUS_SESSIONS_V1',
  [STORAGE_DOMAINS.ACHIEVEMENTS]: 'kairos_achievements_state_v6',
  [STORAGE_DOMAINS.SQUAD_STATE]: 'KAIROS_SQUAD_STATE_V1',
  [STORAGE_DOMAINS.SQUAD_LEGACY_CHALLENGES]: 'KAIROS_SQUAD_CHALLENGES_V1',
  [STORAGE_DOMAINS.NOTIFICATIONS]: 'KAIROS_NOTIFICATIONS_V1',
  [STORAGE_DOMAINS.PINNED_REMINDER]: 'KAIROS_PINNED_REMINDER_V1',
  [STORAGE_DOMAINS.DAILY_REFLECTIONS]: 'KAIROS_DAILY_REFLECTIONS_V1',
  [STORAGE_DOMAINS.PROFILE_EXTENSION]: 'KAIROS_USER_PROFILE_EXT_V1',
  [STORAGE_DOMAINS.DOWNTIME_SETTINGS]: 'kairos_downtime_settings',
  [STORAGE_DOMAINS.APPS_USAGE]: 'kairos_apps_usage',
  [STORAGE_DOMAINS.HOURLY_TIMELINE]: 'kairos_hourly_timeline',
  [STORAGE_DOMAINS.APP_FOCUS_LIMITS]: 'kairos_app_focus_limits',
  [STORAGE_DOMAINS.BREAK_INTERVALS]: 'kairos_break_intervals',
  [STORAGE_DOMAINS.CONNECTIONS]: 'KAIROS_CONNECTIONS_STATE_V1',
  [STORAGE_DOMAINS.INCOMING_REQUESTS]: 'KAIROS_INCOMING_REQUESTS_V1',
  [STORAGE_DOMAINS.OUTGOING_REQUESTS]: 'KAIROS_OUTGOING_REQUESTS_V1',
  [STORAGE_DOMAINS.SETTINGS_PREFERENCES]: 'KAIROS_SETTINGS_PREFERENCES_V1'
};

// Internal active user in memory (defaults to reading saved ID or null)
let currentActiveUserId: string | null = null;

/**
 * Normalizes a user input (string or userProfile object) into a deterministic, safe storage identifier.
 * 
 * Rules:
 * - lowercase, trimmed
 * - non-alphanumeric chars replaced with '_'
 * - duplicate underscores collapsed
 * - leading/trailing underscores stripped
 */
export function normalizeUserId(
  input?: string | { email?: string; id?: string; userId?: string; username?: string; name?: string } | null
): string {
  if (!input) return 'default_user';

  let raw = '';
  if (typeof input === 'string') {
    raw = input;
  } else if (typeof input === 'object') {
    raw = input.id || input.userId || input.email || input.username || input.name || '';
  }

  if (!raw || typeof raw !== 'string') return 'default_user';

  const clean = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  return clean || 'default_user';
}

/**
 * Returns the currently active normalized user identifier.
 */
export function getActiveUserId(): string {
  if (currentActiveUserId) {
    return currentActiveUserId;
  }

  // Attempt to load from storage
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(KEY_ACTIVE_USER_ID);
      if (saved && typeof saved === 'string') {
        currentActiveUserId = normalizeUserId(saved);
        return currentActiveUserId;
      }
    } catch {}
  } else if (typeof global !== 'undefined' && (global as any).localStorage) {
    try {
      const saved = (global as any).localStorage.getItem(KEY_ACTIVE_USER_ID);
      if (saved && typeof saved === 'string') {
        currentActiveUserId = normalizeUserId(saved);
        return currentActiveUserId;
      }
    } catch {}
  }

  return 'default_user';
}

/**
 * Sets the active user context and persists the active user identifier.
 * Also triggers legacy data migration if eligible for this user.
 */
export function setActiveUserId(
  userIdOrUser?: string | { email?: string; id?: string; username?: string; name?: string } | null
): string {
  const normalized = normalizeUserId(userIdOrUser);
  currentActiveUserId = normalized;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(KEY_ACTIVE_USER_ID, normalized);
    } else if (typeof global !== 'undefined' && (global as any).localStorage) {
      (global as any).localStorage.setItem(KEY_ACTIVE_USER_ID, normalized);
    }
  } catch {}

  migrateLegacyDataIfEligible(normalized);
  return normalized;
}

/**
 * Clears the active user context (used during logout).
 */
export function clearActiveUser(): void {
  currentActiveUserId = null;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(KEY_ACTIVE_USER_ID);
    } else if (typeof global !== 'undefined' && (global as any).localStorage) {
      (global as any).localStorage.removeItem(KEY_ACTIVE_USER_ID);
    }
  } catch {}
}

export type UserIdentifier = string | { email?: string; id?: string; username?: string; name?: string } | null;

/**
 * Generates the user-scoped storage key for a domain.
 * Format: KAIROS_USER_<normalizedUserId>_<DOMAIN_KEY>
 */
export function getUserStorageKey(domainKey: StorageDomainKey, userId?: UserIdentifier): string {
  const uid = userId ? normalizeUserId(userId) : getActiveUserId();
  return `KAIROS_USER_${uid}_${domainKey}`;
}

/**
 * Gets an item from the active (or specified) user's scoped storage.
 * Safe fallback to legacy key if unmigrated.
 */
export function getUserScopedItem(domainKey: StorageDomainKey, userId?: UserIdentifier): string | null {
  const scopedKey = getUserStorageKey(domainKey, userId);
  try {
    const storage = typeof window !== 'undefined' ? window.localStorage : (typeof global !== 'undefined' ? (global as any).localStorage : null);
    if (!storage) return null;

    const scopedVal = storage.getItem(scopedKey);
    if (scopedVal !== null && scopedVal !== undefined) {
      return scopedVal;
    }

    // If scoped key is empty, check if legacy key exists and this user is eligible
    const legacyKey = LEGACY_GLOBAL_KEYS[domainKey];
    if (legacyKey) {
      const legacyVal = storage.getItem(legacyKey);
      if (legacyVal !== null && legacyVal !== undefined) {
        const claimedBy = storage.getItem(KEY_LEGACY_MIGRATION_CLAIMED);
        const currentUid = userId ? normalizeUserId(userId) : getActiveUserId();
        // If legacy data has not been claimed, or was claimed by this user, return it
        if (!claimedBy || claimedBy === currentUid) {
          return legacyVal;
        }
      }
    }
  } catch {}
  return null;
}

/**
 * Writes an item to the active (or specified) user's scoped storage.
 */
export function setUserScopedItem(domainKey: StorageDomainKey, value: string, userId?: UserIdentifier): void {
  const scopedKey = getUserStorageKey(domainKey, userId);
  try {
    const storage = typeof window !== 'undefined' ? window.localStorage : (typeof global !== 'undefined' ? (global as any).localStorage : null);
    if (!storage) return;
    storage.setItem(scopedKey, value);
  } catch {}
}

/**
 * Removes an item from the active (or specified) user's scoped storage.
 */
export function removeUserScopedItem(domainKey: StorageDomainKey, userId?: UserIdentifier): void {
  const scopedKey = getUserStorageKey(domainKey, userId);
  try {
    const storage = typeof window !== 'undefined' ? window.localStorage : (typeof global !== 'undefined' ? (global as any).localStorage : null);
    if (!storage) return;
    storage.removeItem(scopedKey);
  } catch {}
}

/**
 * Safely parses and returns JSON from the user's scoped storage.
 */
export function getUserScopedJSON<T>(domainKey: StorageDomainKey, fallback: T, userId?: UserIdentifier): T {
  const raw = getUserScopedItem(domainKey, userId);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Safely serializes and writes JSON to the user's scoped storage.
 */
export function setUserScopedJSON<T>(domainKey: StorageDomainKey, value: T, userId?: UserIdentifier): void {
  try {
    const serialized = JSON.stringify(value);
    setUserScopedItem(domainKey, serialized, userId);
  } catch {}
}

/**
 * Migrates pre-existing legacy global storage data into the first authenticated user's namespace.
 * 
 * Invariants:
 * - Runs only once for the claiming user.
 * - Idempotent and deterministic.
 * - Never overwrites existing valid user-scoped state.
 * - Leaves legacy keys intact for non-destructive backward compatibility.
 */
export function migrateLegacyDataIfEligible(userId: string): boolean {
  const uid = normalizeUserId(userId);
  try {
    const storage = typeof window !== 'undefined' ? window.localStorage : (typeof global !== 'undefined' ? (global as any).localStorage : null);
    if (!storage) return false;

    const claimedBy = storage.getItem(KEY_LEGACY_MIGRATION_CLAIMED);
    if (claimedBy && claimedBy !== uid) {
      // Legacy data was already claimed by another user
      return false;
    }

    let migratedAny = false;

    for (const [domainKey, legacyKey] of Object.entries(LEGACY_GLOBAL_KEYS)) {
      const scopedKey = getUserStorageKey(domainKey, uid);
      const existingScoped = storage.getItem(scopedKey);

      // Only copy if scoped key does not already exist
      if (existingScoped === null || existingScoped === undefined) {
        const legacyVal = storage.getItem(legacyKey);
        if (legacyVal !== null && legacyVal !== undefined) {
          storage.setItem(scopedKey, legacyVal);
          migratedAny = true;
        }
      }
    }

    // Mark migration as claimed by this user
    if (migratedAny || !claimedBy) {
      storage.setItem(KEY_LEGACY_MIGRATION_CLAIMED, uid);
    }

    return migratedAny;
  } catch {
    return false;
  }
}

/**
 * Clears all user-scoped data for a specific user ID or active user (used for account deletion).
 */
export function clearUserScopedData(
  userId?: UserIdentifier
): void {
  const targetId = userId || currentActiveUserId || getActiveUserId();
  if (!targetId) return;
  const uid = normalizeUserId(targetId);
  try {
    const storage = typeof window !== 'undefined' ? window.localStorage : (typeof global !== 'undefined' ? (global as any).localStorage : null);
    if (!storage) return;

    // 1. Remove all known domains
    for (const domainKey of Object.values(STORAGE_DOMAINS)) {
      const scopedKey = getUserStorageKey(domainKey, uid);
      storage.removeItem(scopedKey);
    }

    // 2. Scan all keys in storage to ensure complete cleanup of any KAIROS_USER_<uid>_* keys
    const userPrefix = `KAIROS_USER_${uid}_`;
    if (typeof storage.length === 'number' && typeof storage.key === 'function') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k && k.startsWith(userPrefix)) {
          keysToRemove.push(k);
        }
      }
      for (const k of keysToRemove) {
        storage.removeItem(k);
      }
    }
  } catch {}
}
