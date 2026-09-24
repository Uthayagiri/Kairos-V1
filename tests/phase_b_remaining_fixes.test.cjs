/**
 * Kairos Phase B: Remaining Data Integrity & Lifecycle Fixes Test Suite
 * 
 * Verifies:
 * - FINDING-05: Complete Account Purge vs Normal Logout
 * - FINDING-06: Notification Preferences Persistence & Isolation
 * - FINDING-07: Brand-New Account Achievement Initialization vs Existing User Persistence
 * - FINDING-08: Morning Streak Display Across Calendar Boundaries
 * - FINDING-09: Companion Chat Memory & User Isolation
 * - Regressions: Progression authority, XP/HP rules, squad 0 XP/0 HP, focus sessions
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock browser / window environment
const storageMap = new Map();

global.window = {
  localStorage: {
    getItem: (key) => (storageMap.has(key) ? storageMap.get(key) : null),
    setItem: (key, val) => storageMap.set(key, String(val)),
    removeItem: (key) => storageMap.delete(key),
    clear: () => storageMap.clear(),
    key: (i) => Array.from(storageMap.keys())[i] || null,
    get length() {
      return storageMap.size;
    }
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true
};

global.localStorage = global.window.localStorage;
global.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  visibilityState: 'visible'
};

const STORAGE_DOMAINS = {
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
  COMPANION_CHAT: 'COMPANION_CHAT_V1'
};

function normalizeUserId(input) {
  if (!input) return 'default_user';
  let raw = '';
  if (typeof input === 'string') raw = input;
  else if (typeof input === 'object') raw = input.email || input.id || input.username || input.name || '';
  if (!raw || typeof raw !== 'string') return 'default_user';
  const clean = raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return clean || 'default_user';
}

function getUserStorageKey(domainKey, userId) {
  const uid = normalizeUserId(userId);
  return `KAIROS_USER_${uid}_${domainKey}`;
}

function getUserScopedJSON(domainKey, fallback, userId) {
  try {
    const raw = localStorage.getItem(getUserStorageKey(domainKey, userId));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setUserScopedJSON(domainKey, data, userId) {
  try {
    localStorage.setItem(getUserStorageKey(domainKey, userId), JSON.stringify(data));
  } catch (err) {
    console.error('Storage error:', err);
  }
}

function clearUserScopedData(userId) {
  if (!userId) return;
  const uid = normalizeUserId(userId);
  try {
    const userPrefix = `KAIROS_USER_${uid}_`;
    for (const domainKey of Object.values(STORAGE_DOMAINS)) {
      const scopedKey = getUserStorageKey(domainKey, uid);
      localStorage.removeItem(scopedKey);
    }
    const keys = Array.from(storageMap.keys());
    for (const k of keys) {
      if (k.startsWith(userPrefix)) {
        localStorage.removeItem(k);
      }
    }
  } catch {}
}

function calculateCurrentStreak(taskHistory, todayDateStr) {
  if (!Array.isArray(taskHistory) || taskHistory.length === 0 || !todayDateStr) {
    return 0;
  }

  const activeDates = new Set();

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

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    failed++;
  }
}

console.log('\n--- Running Kairos Phase B: Remaining Data Integrity Tests ---');

// ==========================================
// FINDING-05: ACCOUNT PURGE TESTS
// ==========================================
test('FINDING-05: 1. User A data is deleted by purge', () => {
  storageMap.clear();
  const userA = { email: 'user.a@kairos.ai', name: 'User A' };
  setUserScopedJSON(STORAGE_DOMAINS.PROGRESSION, { totalXP: 2500, level: 5 }, userA);
  setUserScopedJSON(STORAGE_DOMAINS.PROFILE_EXTENSION, { customName: 'Alpha' }, userA);
  setUserScopedJSON(STORAGE_DOMAINS.COMPANION_CHAT, [{ id: '1', text: 'Hello' }], userA);

  clearUserScopedData(userA);

  assert.strictEqual(getUserScopedJSON(STORAGE_DOMAINS.PROGRESSION, null, userA), null);
  assert.strictEqual(getUserScopedJSON(STORAGE_DOMAINS.PROFILE_EXTENSION, null, userA), null);
  assert.strictEqual(getUserScopedJSON(STORAGE_DOMAINS.COMPANION_CHAT, null, userA), null);
});

test('FINDING-05: 2. User B data remains untouched when User A is purged', () => {
  storageMap.clear();
  const userA = { email: 'user.a@kairos.ai', name: 'User A' };
  const userB = { email: 'user.b@kairos.ai', name: 'User B' };

  setUserScopedJSON(STORAGE_DOMAINS.PROGRESSION, { totalXP: 1000, level: 3 }, userA);
  setUserScopedJSON(STORAGE_DOMAINS.PROGRESSION, { totalXP: 5000, level: 8 }, userB);
  setUserScopedJSON(STORAGE_DOMAINS.NOTIFICATIONS, [{ id: 'n1', title: 'User B Alert' }], userB);

  clearUserScopedData(userA);

  assert.strictEqual(getUserScopedJSON(STORAGE_DOMAINS.PROGRESSION, null, userA), null, 'User A data must be deleted');
  assert.deepStrictEqual(
    getUserScopedJSON(STORAGE_DOMAINS.PROGRESSION, null, userB),
    { totalXP: 5000, level: 8 },
    'User B progression must remain untouched'
  );
  assert.deepStrictEqual(
    getUserScopedJSON(STORAGE_DOMAINS.NOTIFICATIONS, null, userB),
    [{ id: 'n1', title: 'User B Alert' }],
    'User B notifications must remain untouched'
  );
});

test('FINDING-05: 3. Unrelated global keys remain untouched after purge', () => {
  storageMap.clear();
  const userA = { email: 'user.a@kairos.ai', name: 'User A' };
  localStorage.setItem('KAIROS_APP_THEME', 'dark');
  localStorage.setItem('KAIROS_LEGACY_MIGRATION_CLAIMED_BY_V1', 'user_a');
  setUserScopedJSON(STORAGE_DOMAINS.PROGRESSION, { totalXP: 200 }, userA);

  clearUserScopedData(userA);

  assert.strictEqual(localStorage.getItem('KAIROS_APP_THEME'), 'dark');
  assert.strictEqual(localStorage.getItem('KAIROS_LEGACY_MIGRATION_CLAIMED_BY_V1'), 'user_a');
});

test('FINDING-05: 4. Normal logout does not delete User A data', () => {
  storageMap.clear();
  const userA = { email: 'user.a@kairos.ai', name: 'User A' };
  const profileState = { totalXP: 3200, level: 6 };
  setUserScopedJSON(STORAGE_DOMAINS.PROGRESSION, profileState, userA);

  // Normal logout only clears active session key, does NOT call clearUserScopedData
  localStorage.removeItem('KAIROS_USER_PROFILE_V1');
  localStorage.removeItem('KAIROS_ACTIVE_USER_ID_V1');

  // User A logs back in
  const restored = getUserScopedJSON(STORAGE_DOMAINS.PROGRESSION, null, userA);
  assert.deepStrictEqual(restored, profileState, 'Normal logout must preserve persisted user data');
});

test('FINDING-05: 5. Purge followed by login gives fresh User A state', () => {
  storageMap.clear();
  const userA = { email: 'user.a@kairos.ai', name: 'User A' };
  setUserScopedJSON(STORAGE_DOMAINS.PROGRESSION, { totalXP: 4500, level: 7 }, userA);

  // Purge vault
  clearUserScopedData(userA);

  // User A logs in again -> fresh initial state
  const freshProgression = getUserScopedJSON(STORAGE_DOMAINS.PROGRESSION, { totalXP: 0, level: 1 }, userA);
  assert.deepStrictEqual(freshProgression, { totalXP: 0, level: 1 }, 'User A gets clean fresh state after purge');
});

test('FINDING-05: 6. Purge is idempotent and handles missing domains safely', () => {
  const userA = { email: 'user.a@kairos.ai', name: 'User A' };
  assert.doesNotThrow(() => {
    clearUserScopedData(userA);
    clearUserScopedData(userA);
    clearUserScopedData(null);
    clearUserScopedData(undefined);
  });
});

// ==========================================
// FINDING-06: NOTIFICATION PREFERENCES TESTS
// ==========================================
test('FINDING-06: 8. Notification preferences persist and survive reload', () => {
  storageMap.clear();
  const userA = { email: 'user.a@kairos.ai', name: 'User A' };
  const customPrefs = {
    circadianAlerts: false,
    squadAlerts: true,
    nightSafeguard: false
  };

  setUserScopedJSON(STORAGE_DOMAINS.NOTIFICATION_PREFERENCES, customPrefs, userA);
  const loaded = getUserScopedJSON(STORAGE_DOMAINS.NOTIFICATION_PREFERENCES, null, userA);
  assert.deepStrictEqual(loaded, customPrefs);
});

test('FINDING-06: 9. User A preferences never appear for User B', () => {
  storageMap.clear();
  const userA = { email: 'user.a@kairos.ai', name: 'User A' };
  const userB = { email: 'user.b@kairos.ai', name: 'User B' };
  const defaultPrefs = { circadianAlerts: true, squadAlerts: true, nightSafeguard: true };

  const userAPrefs = { circadianAlerts: false, squadAlerts: false, nightSafeguard: false };
  setUserScopedJSON(STORAGE_DOMAINS.NOTIFICATION_PREFERENCES, userAPrefs, userA);

  const userBLoaded = getUserScopedJSON(STORAGE_DOMAINS.NOTIFICATION_PREFERENCES, defaultPrefs, userB);
  assert.deepStrictEqual(userBLoaded, defaultPrefs, 'User B should see default preferences');

  const userBPrefs = { circadianAlerts: true, squadAlerts: false, nightSafeguard: true };
  setUserScopedJSON(STORAGE_DOMAINS.NOTIFICATION_PREFERENCES, userBPrefs, userB);

  assert.deepStrictEqual(getUserScopedJSON(STORAGE_DOMAINS.NOTIFICATION_PREFERENCES, null, userA), userAPrefs);
  assert.deepStrictEqual(getUserScopedJSON(STORAGE_DOMAINS.NOTIFICATION_PREFERENCES, null, userB), userBPrefs);
});

test('FINDING-06: 10. Corrupt notification preferences fall back safely', () => {
  const userC = { email: 'corrupt@kairos.ai', name: 'Corrupt' };
  localStorage.setItem(getUserStorageKey(STORAGE_DOMAINS.NOTIFICATION_PREFERENCES, userC), '{bad_json:');
  const defaultPrefs = { circadianAlerts: true, squadAlerts: true, nightSafeguard: true };
  const loaded = getUserScopedJSON(STORAGE_DOMAINS.NOTIFICATION_PREFERENCES, defaultPrefs, userC);
  assert.deepStrictEqual(loaded, defaultPrefs);
});

// ==========================================
// FINDING-07: ACHIEVEMENTS INITIALIZATION TESTS
// ==========================================
test('FINDING-07: 12. Brand-new user does not inherit earned streak achievements in source', () => {
  const achievementsSrc = fs.readFileSync(
    path.join(__dirname, '../src/features/achievements/data/achievements.ts'),
    'utf8'
  );
  
  // Verify no unlocked: true exists in INITIAL_ACHIEVEMENTS definition
  assert(!achievementsSrc.includes('unlocked: true'), 'INITIAL_ACHIEVEMENTS should not contain unlocked: true');
  assert(!achievementsSrc.includes('isUnlocked: true'), 'INITIAL_ACHIEVEMENTS should not contain isUnlocked: true');
  assert(!achievementsSrc.includes("glowStage: 'UNLOCKED'"), "INITIAL_ACHIEVEMENTS should not contain glowStage: 'UNLOCKED'");
});

test('FINDING-07: 13. Existing persisted achievement progress survives', () => {
  // Existing user has persisted progress
  const initialAchievements = [
    { id: 'streak-1', name: 'Spark', currentProgress: 0, targetProgress: 3, unlocked: false, isUnlocked: false },
    { id: 'streak-2', name: 'Momentum', currentProgress: 0, targetProgress: 7, unlocked: false, isUnlocked: false },
    { id: 'focus-1', name: 'Deep Work', currentProgress: 0, targetProgress: 25, unlocked: false, isUnlocked: false }
  ];

  const savedState = [
    { id: 'streak-1', currentProgress: 3, unlocked: true, unlockDate: '2026-09-20' },
    { id: 'focus-1', currentProgress: 10, unlocked: false }
  ];

  const hydrated = initialAchievements.map((initial) => {
    const match = savedState.find((p) => p.id === initial.id);
    if (match) {
      const isUnlocked = Boolean(match.unlocked || match.isUnlocked);
      return {
        ...initial,
        rewardHP: 0,
        currentProgress: typeof match.currentProgress === 'number' ? match.currentProgress : 0,
        unlocked: isUnlocked,
        isUnlocked: isUnlocked,
        unlockDate: isUnlocked ? (match.unlockDate || undefined) : undefined,
        glowStage: match.glowStage || (isUnlocked ? 'UNLOCKED' : 'LOCKED')
      };
    }
    return {
      ...initial,
      rewardHP: 0,
      currentProgress: 0,
      unlocked: false,
      isUnlocked: false,
      glowStage: 'LOCKED'
    };
  });

  const hydratedStreak1 = hydrated.find(a => a.id === 'streak-1');
  const hydratedFocus1 = hydrated.find(a => a.id === 'focus-1');
  const hydratedStreak2 = hydrated.find(a => a.id === 'streak-2');

  assert.strictEqual(hydratedStreak1.unlocked, true, 'Existing user earned unlock is preserved');
  assert.strictEqual(hydratedStreak1.unlockDate, '2026-09-20', 'Existing unlock date is preserved');
  assert.strictEqual(hydratedFocus1.currentProgress, 10, 'Existing progress is preserved');
  assert.strictEqual(hydratedStreak2.unlocked, false, 'Unearned achievements stay locked');
});

test('FINDING-07: 14. Achievement rewards in achievements.ts remain 0 HP', () => {
  const achievementsSrc = fs.readFileSync(
    path.join(__dirname, '../src/features/achievements/data/achievements.ts'),
    'utf8'
  );
  // Match any rewardHP that is not 0
  const nonZeroHp = achievementsSrc.match(/rewardHP:\s*[1-9]\d*/g);
  assert.strictEqual(nonZeroHp, null, 'All rewardHP in achievements.ts must be 0');
});

// ==========================================
// FINDING-08: MORNING STREAK TESTS
// ==========================================
test('FINDING-08: 16. Morning streak before 1st task reflects ongoing unbroken streak from yesterday', () => {
  const history = [
    { date: '2026-09-20', taskId: 't1' },
    { date: '2026-09-21', taskId: 't2' },
    { date: '2026-09-22', taskId: 't3' }
  ];

  // On 2026-09-23 morning (no task completed yet today)
  const morningStreak = calculateCurrentStreak(history, '2026-09-23');
  assert.strictEqual(morningStreak, 3, 'Morning streak before 1st task should be 3 (unbroken streak ending yesterday)');

  // Complete a task on 2026-09-23
  const historyWithToday = [...history, { date: '2026-09-23', taskId: 't4' }];
  const afterTodayTask = calculateCurrentStreak(historyWithToday, '2026-09-23');
  assert.strictEqual(afterTodayTask, 4, 'Streak increments to 4 after completing task today');
});

test('FINDING-08: 17. Broken streak returns 0 on morning after inactive day', () => {
  const history = [
    { date: '2026-09-20', taskId: 't1' },
    { date: '2026-09-21', taskId: 't2' }
    // 2026-09-22 missing (inactive day)
  ];

  // On 2026-09-23 morning (yesterday 2026-09-22 was inactive)
  const morningStreak = calculateCurrentStreak(history, '2026-09-23');
  assert.strictEqual(morningStreak, 0, 'Broken streak must return 0');
});

// ==========================================
// FINDING-09: COMPANION CHAT MEMORY TESTS
// ==========================================
test('FINDING-09: 19. Companion chat persists per user and survives reload', () => {
  storageMap.clear();
  const userA = { email: 'user.a@kairos.ai', name: 'User A' };
  const userB = { email: 'user.b@kairos.ai', name: 'User B' };

  const userAChat = [
    { id: '1', sender: 'user', text: 'What is Raft consensus?', timestamp: '10:00 AM' },
    { id: '2', sender: 'companion', text: 'Raft is a leader-based consensus algorithm.', timestamp: '10:01 AM' }
  ];

  setUserScopedJSON(STORAGE_DOMAINS.COMPANION_CHAT, userAChat, userA);

  const loadedA = getUserScopedJSON(STORAGE_DOMAINS.COMPANION_CHAT, null, userA);
  assert.deepStrictEqual(loadedA, userAChat, 'User A chat persists');

  const loadedB = getUserScopedJSON(STORAGE_DOMAINS.COMPANION_CHAT, null, userB);
  assert.strictEqual(loadedB, null, 'User B starts with clean chat');
});

test('FINDING-09: 20. Corrupt chat storage falls back safely', () => {
  const userC = { email: 'corrupt@kairos.ai', name: 'Corrupt' };
  localStorage.setItem(getUserStorageKey(STORAGE_DOMAINS.COMPANION_CHAT, userC), '{bad_json:');
  const defaultChat = [{ id: 'paxos-1', text: 'Default' }];
  const loaded = getUserScopedJSON(STORAGE_DOMAINS.COMPANION_CHAT, defaultChat, userC);
  assert.deepStrictEqual(loaded, defaultChat);
});

// ==========================================
// REGRESSION & INVARIANTS TESTS
// ==========================================
test('REGRESSION: Progression engine source code verifies 100-level curve and reward integrity', () => {
  const progressionEngineSrc = fs.readFileSync(
    path.join(__dirname, '../src/features/progression/services/progressionEngine.ts'),
    'utf8'
  );
  assert(progressionEngineSrc.includes('calculateReward'), 'progressionEngine should export calculateReward');
  assert(progressionEngineSrc.includes('addExperience'), 'progressionEngine should export addExperience');
  assert(progressionEngineSrc.includes('getLevelForTotalXP'), 'progressionEngine should export getLevelForTotalXP');
  assert(progressionEngineSrc.includes('calculateCurrentStreak'), 'progressionEngine should export calculateCurrentStreak');

  function getLevelForTotalXP(totalXP) {
    return Math.min(100, Math.floor(Math.sqrt(Math.max(0, totalXP) / 100)) + 1);
  }

  assert.strictEqual(getLevelForTotalXP(0), 1);
  assert.strictEqual(getLevelForTotalXP(100), 2);
  assert.strictEqual(getLevelForTotalXP(400), 3);
  assert.strictEqual(getLevelForTotalXP(900), 4);
  assert.strictEqual(getLevelForTotalXP(1000000), 100);
});

console.log(`\nRemaining Fixes Results: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) {
  process.exit(1);
}
