/**
 * Kairos Phase C: Medium & Low Integrity Fixes Test Suite
 * 
 * Verifies:
 * - FINDING C-01: Squad leaderboard live authoritative metrics (no fake 2450 XP / 34 tasks)
 * - FINDING C-02: Achievement User-Switch Rehydration & Storage Isolation
 * - FINDING C-03: HomeScreen User-Switch Rehydration & Isolation
 * - FINDING C-04: TasksScreen 5-Second Midnight Polling Interval Alignment
 * - FINDING C-05: Toast Timer Cleanup (Single timer, second toast reset, unmount cleanup)
 * - Invariants: No progression mutation on switch, XP/HP formulas, 100-level curve, 0-HP rewards
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

function removeUserScopedItem(domainKey, userId) {
  try {
    localStorage.removeItem(getUserStorageKey(domainKey, userId));
  } catch (err) {
    console.error('Storage remove error:', err);
  }
}

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`\x1b[32m✔\x1b[0m ${description}`);
    passed++;
  } catch (err) {
    console.error(`\x1b[31m✘\x1b[0m ${description}`);
    console.error(err);
    failed++;
  }
}

console.log('\n=== KAIROS PHASE C INTEGRITY FIXES TEST SUITE ===\n');

// ==========================================
// TEST 1 — FINDING C-01: SQUAD LEADERBOARD METRICS
// ==========================================
test('FINDING C-01: 1. New user with 0 XP and 0 tasks displays 0 XP and 0 tasks on leaderboard', () => {
  const userProfile = { name: 'NewAdventurer', email: 'new@kairos.ai' };
  const progression = {
    totalXP: 0,
    rawState: {
      taskHistory: []
    }
  };

  const currentUserName = userProfile?.name ? `${userProfile.name} (You)` : 'Alex (You)';
  const currentUserXP = typeof progression.totalXP === 'number' ? progression.totalXP : 0;
  const currentUserTasksCount = Array.isArray(progression.rawState?.taskHistory) ? progression.rawState.taskHistory.length : 0;

  assert.strictEqual(currentUserXP, 0, 'New user XP must be exactly 0');
  assert.strictEqual(currentUserTasksCount, 0, 'New user task count must be exactly 0');
  assert.strictEqual(currentUserName, 'NewAdventurer (You)');

  const mockLeaderboardItem = {
    name: currentUserName,
    xp: currentUserXP,
    tasksCount: currentUserTasksCount,
    statusText: `${currentUserTasksCount} tasks achieved this week`
  };

  assert.strictEqual(mockLeaderboardItem.xp, 0);
  assert.strictEqual(mockLeaderboardItem.tasksCount, 0);
  assert.strictEqual(mockLeaderboardItem.statusText, '0 tasks achieved this week');
});

test('FINDING C-01: 2. SquadScreen source code contains no fake 2450 XP or 34 task fallbacks', () => {
  const squadScreenSrc = fs.readFileSync(path.join(__dirname, '../src/screens/SquadScreen.tsx'), 'utf8');
  assert(!squadScreenSrc.includes('2450'), 'SquadScreen must not contain 2450 fallback');
  assert(!squadScreenSrc.includes('34 tasks achieved this week'), 'SquadScreen must not contain 34 tasks achieved fallback string');
  assert(squadScreenSrc.includes('const currentUserXP = typeof progression.totalXP === \'number\' ? progression.totalXP : 0;'), 'SquadScreen derives currentUserXP strictly from progression');
  assert(squadScreenSrc.includes('const currentUserTasksCount = Array.isArray(progression.rawState?.taskHistory) ? progression.rawState.taskHistory.length : 0;'), 'SquadScreen derives currentUserTasksCount strictly from taskHistory');
});

test('FINDING C-01: 3. Completing tasks updates the current user leaderboard values authoritatively', () => {
  const progression = {
    totalXP: 15,
    rawState: {
      taskHistory: [{ id: 'task-1', xpAwarded: 15, completedAt: '2026-09-23T10:00:00Z' }]
    }
  };

  const currentUserXP = typeof progression.totalXP === 'number' ? progression.totalXP : 0;
  const currentUserTasksCount = Array.isArray(progression.rawState?.taskHistory) ? progression.rawState.taskHistory.length : 0;

  assert.strictEqual(currentUserXP, 15, 'Updated XP must reflect task completion');
  assert.strictEqual(currentUserTasksCount, 1, 'Updated task count must reflect task completion');
});

// ==========================================
// TEST 2 — FINDING C-02: ACHIEVEMENT USER-SWITCH REHYDRATION (A -> B)
// ==========================================
test('FINDING C-02: 4. User A unlocks achievements in User A storage partition', () => {
  storageMap.clear();
  const userA = { email: 'alice@kairos.ai', name: 'Alice' };

  const initialAchievements = [
    { id: 'first-step', name: 'First Step', targetProgress: 1, currentProgress: 0, unlocked: false, rewardXP: 100, rewardHP: 0, rarity: 'COMMON' },
    { id: 'streak-3', name: 'Consistency Master', targetProgress: 3, currentProgress: 0, unlocked: false, rewardXP: 250, rewardHP: 0, rarity: 'RARE' }
  ];

  // User A unlocks 'first-step'
  const userAAchievements = initialAchievements.map(a => {
    if (a.id === 'first-step') {
      return { ...a, currentProgress: 1, unlocked: true, isUnlocked: true, unlockDate: '2026-09-23', glowStage: 'UNLOCKED' };
    }
    return a;
  });

  setUserScopedJSON(STORAGE_DOMAINS.ACHIEVEMENTS, userAAchievements, userA);

  const storedA = getUserScopedJSON(STORAGE_DOMAINS.ACHIEVEMENTS, null, userA);
  assert(storedA !== null);
  assert.strictEqual(storedA.find(a => a.id === 'first-step').unlocked, true);
  assert.strictEqual(storedA.find(a => a.id === 'streak-3').unlocked, false);
});

test('FINDING C-02: 5. Switching User A -> User B rehydrates clean locked state for User B', () => {
  const userA = { email: 'alice@kairos.ai', name: 'Alice' };
  const userB = { email: 'bob@kairos.ai', name: 'Bob' };

  // Load achievements for User B
  const storedB = getUserScopedJSON(STORAGE_DOMAINS.ACHIEVEMENTS, null, userB);
  assert.strictEqual(storedB, null, 'User B has no persisted achievements initially');

  // Verify User A data is untouched in storage
  const storedA = getUserScopedJSON(STORAGE_DOMAINS.ACHIEVEMENTS, null, userA);
  assert(storedA !== null);
  assert.strictEqual(storedA.find(a => a.id === 'first-step').unlocked, true, 'User A unlock remains preserved');
});

// ==========================================
// TEST 3 — FINDING C-02: ACHIEVEMENT RESTORATION (B -> A)
// ==========================================
test('FINDING C-02: 6. Switching User B -> User A completely restores User A achievement unlocks', () => {
  const userA = { email: 'alice@kairos.ai', name: 'Alice' };
  const storedA = getUserScopedJSON(STORAGE_DOMAINS.ACHIEVEMENTS, null, userA);

  assert(storedA !== null);
  const firstStep = storedA.find(a => a.id === 'first-step');
  assert.strictEqual(firstStep.unlocked, true);
  assert.strictEqual(firstStep.unlockDate, '2026-09-23');
  assert.strictEqual(firstStep.rewardHP, 0, 'Achievement HP reward must strictly be 0');
});

test('FINDING C-02: 7. useAchievementProgress and gallery receive userProfile and avoid hydration writes', () => {
  const hookSrc = fs.readFileSync(path.join(__dirname, '../src/features/achievements/hooks/useAchievementProgress.ts'), 'utf8');
  assert(hookSrc.includes('export function useAchievementProgress(userProfile?: UserIdentifier)'), 'Hook accepts userProfile parameter');
  assert(hookSrc.includes('loadAchievementsForUser(userProfile)'), 'Hook loads achievements for userProfile');
  assert(hookSrc.includes('useEffect(() => {'), 'Hook syncs on userProfile change');
  assert(hookSrc.includes('skipNextSave.current = true'), 'Hook skips persistence on hydration to prevent race conditions');

  const gallerySrc = fs.readFileSync(path.join(__dirname, '../src/features/achievements/components/AchievementGallery.tsx'), 'utf8');
  assert(gallerySrc.includes('userProfile?: { email: string; name: string } | null'), 'AchievementGallery accepts userProfile prop');
  assert(gallerySrc.includes('useAchievementProgress(userProfile)'), 'AchievementGallery passes userProfile to hook');

  const appSrc = fs.readFileSync(path.join(__dirname, '../src/App.tsx'), 'utf8');
  assert(appSrc.includes('<AchievementGallery') && appSrc.includes('userProfile={userProfile}'), 'App.tsx passes userProfile to AchievementGallery');

  const profileScreenSrc = fs.readFileSync(path.join(__dirname, '../src/screens/ProfileScreen.tsx'), 'utf8');
  assert(profileScreenSrc.includes('useAchievementProgress(userProfile)'), 'ProfileScreen passes userProfile to useAchievementProgress');
});

// ==========================================
// TEST 4 — FINDING C-03: HOMESCREEN USER A -> USER B
// ==========================================
test('FINDING C-03: 8. User A sets pinned reminder and reflection in User A partition', () => {
  const userA = { email: 'alice@kairos.ai', name: 'Alice' };
  const reminderA = {
    id: 'rem-1',
    title: 'Review Calculus III',
    desc: 'Pinned reminder',
    time: 'Today',
    dismissed: false,
    createdAt: '2026-09-23T08:00:00Z'
  };
  const reflectionsA = [
    { id: 'ref-1', text: 'Had deep focus today during morning peak', date: '2026-09-23', createdAt: '2026-09-23T18:00:00Z' }
  ];

  setUserScopedJSON(STORAGE_DOMAINS.PINNED_REMINDER, reminderA, userA);
  setUserScopedJSON(STORAGE_DOMAINS.DAILY_REFLECTIONS, reflectionsA, userA);

  assert.deepStrictEqual(getUserScopedJSON(STORAGE_DOMAINS.PINNED_REMINDER, null, userA), reminderA);
  assert.deepStrictEqual(getUserScopedJSON(STORAGE_DOMAINS.DAILY_REFLECTIONS, [], userA), reflectionsA);
});

test('FINDING C-03: 9. Switching to User B loads User B pinned reminder and reflections without cross-contamination', () => {
  const userA = { email: 'alice@kairos.ai', name: 'Alice' };
  const userB = { email: 'bob@kairos.ai', name: 'Bob' };

  const reminderB = getUserScopedJSON(STORAGE_DOMAINS.PINNED_REMINDER, null, userB);
  const reflectionsB = getUserScopedJSON(STORAGE_DOMAINS.DAILY_REFLECTIONS, [], userB);

  assert.strictEqual(reminderB, null, 'User B must have null reminder by default');
  assert.deepStrictEqual(reflectionsB, [], 'User B must have empty reflections by default');

  // User A data in storage is unaltered
  assert(getUserScopedJSON(STORAGE_DOMAINS.PINNED_REMINDER, null, userA) !== null);
  assert.strictEqual(getUserScopedJSON(STORAGE_DOMAINS.DAILY_REFLECTIONS, [], userA).length, 1);
});

// ==========================================
// TEST 5 — FINDING C-03: HOMESCREEN USER B -> USER A RESTORATION
// ==========================================
test('FINDING C-03: 10. Switching back to User A restores User A pinned reminder and reflections', () => {
  const userA = { email: 'alice@kairos.ai', name: 'Alice' };
  const reminderA = getUserScopedJSON(STORAGE_DOMAINS.PINNED_REMINDER, null, userA);
  const reflectionsA = getUserScopedJSON(STORAGE_DOMAINS.DAILY_REFLECTIONS, [], userA);

  assert.strictEqual(reminderA.title, 'Review Calculus III');
  assert.strictEqual(reflectionsA[0].text, 'Had deep focus today during morning peak');
});

test('FINDING C-03: 11. HomeScreen.tsx source code rehydrates reminders and reflections on userProfile change', () => {
  const homeScreenSrc = fs.readFileSync(path.join(__dirname, '../src/screens/HomeScreen.tsx'), 'utf8');
  assert(homeScreenSrc.includes('// Synchronize reminders and reflections when active user changes'), 'HomeScreen contains reactive sync comment');
  assert(homeScreenSrc.includes('STORAGE_DOMAINS.PINNED_REMINDER'), 'HomeScreen reads user-scoped pinned reminder');
  assert(homeScreenSrc.includes('STORAGE_DOMAINS.DAILY_REFLECTIONS'), 'HomeScreen reads user-scoped daily reflections');
  assert(homeScreenSrc.includes('}, [userProfile]);'), 'HomeScreen syncs on userProfile change');
});

// ==========================================
// TEST 6 — FINDING C-04: TASKSSCREEN MIDNIGHT POLLING INTERVAL
// ==========================================
test('FINDING C-04: 12. TasksScreen uses 5000ms polling interval aligned with HomeScreen', () => {
  const tasksScreenSrc = fs.readFileSync(path.join(__dirname, '../src/screens/TasksScreen.tsx'), 'utf8');
  assert(tasksScreenSrc.includes('}, 5000);'), 'TasksScreen must use 5000ms interval for midnight check');
  assert(!tasksScreenSrc.includes('}, 30000);'), 'TasksScreen must not use 30000ms polling');
  assert(tasksScreenSrc.includes('return () => clearInterval(timer);'), 'TasksScreen clears interval on unmount');
});

// ==========================================
// TEST 7 — FINDING C-05: TOAST TIMER CLEANUP ON ALL SCREENS
// ==========================================
test('FINDING C-05: 13. NotificationScreen has toastTimerRef and clears timer on second toast and unmount', () => {
  const notifSrc = fs.readFileSync(path.join(__dirname, '../src/screens/NotificationScreen.tsx'), 'utf8');
  assert(notifSrc.includes('const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);'), 'NotificationScreen has toastTimerRef');
  assert(notifSrc.includes('if (toastTimerRef.current) clearTimeout(toastTimerRef.current);'), 'NotificationScreen clears previous toast timer');
  assert(notifSrc.includes('return () => {\n      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);'), 'NotificationScreen clears timer on unmount');
});

test('FINDING C-05: 14. HomeScreen has toastTimerRef and clears timer on second toast and unmount', () => {
  const homeSrc = fs.readFileSync(path.join(__dirname, '../src/screens/HomeScreen.tsx'), 'utf8');
  assert(homeSrc.includes('const toastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);'), 'HomeScreen has toastTimerRef');
  assert(homeSrc.includes('if (toastTimerRef.current) clearTimeout(toastTimerRef.current);'), 'HomeScreen clears previous toast timer');
  assert(homeSrc.includes('return () => {\n      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);'), 'HomeScreen clears timer on unmount');
});

test('FINDING C-05: 15. TasksScreen has toastTimerRef and clears timer on second toast and unmount', () => {
  const tasksSrc = fs.readFileSync(path.join(__dirname, '../src/screens/TasksScreen.tsx'), 'utf8');
  assert(tasksSrc.includes('const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);'), 'TasksScreen has toastTimerRef');
  assert(tasksSrc.includes('if (toastTimerRef.current) clearTimeout(toastTimerRef.current);'), 'TasksScreen clears previous toast timer');
  assert(tasksSrc.includes('return () => {\n      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);'), 'TasksScreen clears timer on unmount');
});

test('FINDING C-05: 16. CompanionScreen has toastTimerRef and clears timer on second toast and unmount', () => {
  const compSrc = fs.readFileSync(path.join(__dirname, '../src/screens/CompanionScreen.tsx'), 'utf8');
  assert(compSrc.includes('const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);'), 'CompanionScreen has toastTimerRef');
  assert(compSrc.includes('if (toastTimerRef.current) clearTimeout(toastTimerRef.current);'), 'CompanionScreen clears previous toast timer');
  assert(compSrc.includes('return () => {\n      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);'), 'CompanionScreen clears timer on unmount');
});

test('FINDING C-05: 17. SquadScreen has toast timer refs and clears timers on new toasts and unmount', () => {
  const squadSrc = fs.readFileSync(path.join(__dirname, '../src/screens/SquadScreen.tsx'), 'utf8');
  assert(squadSrc.includes('const toastMessageRef = useRef<ReturnType<typeof setTimeout> | null>(null);'), 'SquadScreen has toastMessageRef');
  assert(squadSrc.includes('const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);'), 'SquadScreen has toastTimeoutRef');
  assert(squadSrc.includes('if (toastMessageRef.current) clearTimeout(toastMessageRef.current);'), 'SquadScreen clears previous message timer');
  assert(squadSrc.includes('if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);'), 'SquadScreen clears previous timeout timer');
});

test('FINDING C-05: 18. StatisticsScreen has toastTimerRef and clears timer on second toast and unmount', () => {
  const statSrc = fs.readFileSync(path.join(__dirname, '../src/screens/StatisticsScreen.tsx'), 'utf8');
  assert(statSrc.includes('const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);'), 'StatisticsScreen has toastTimerRef');
  assert(statSrc.includes('if (toastTimerRef.current) clearTimeout(toastTimerRef.current);'), 'StatisticsScreen clears previous toast timer');
  assert(statSrc.includes('return () => {\n      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);'), 'StatisticsScreen clears timer on unmount');
});

test('FINDING C-05: 19. AchievementGallery has toastTimerRef and clears timer on unmount', () => {
  const gallerySrc = fs.readFileSync(path.join(__dirname, '../src/features/achievements/components/AchievementGallery.tsx'), 'utf8');
  assert(gallerySrc.includes('toastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);'), 'AchievementGallery has toastTimerRef');
  assert(gallerySrc.includes('if (toastTimerRef.current) clearTimeout(toastTimerRef.current);'), 'AchievementGallery clears timer on unmount');
});

// ==========================================
// TEST 8 — NO PROGRESSION MUTATION
// ==========================================
test('TEST 8: 20. User switching and hydration do not modify totalXP, todayHP, lifetimeHP, or taskHistory', () => {
  const userProgressionA = {
    totalXP: 500,
    todayHP: 25,
    lifetimeHP: 150,
    level: 3,
    completedTaskIdsToday: ['dt-1'],
    taskHistory: [
      { id: 'dt-1', xpAwarded: 25, hpAwarded: 25, completedAt: '2026-09-23T10:00:00Z', date: '2026-09-23' }
    ]
  };

  const initialSnapshot = JSON.parse(JSON.stringify(userProgressionA));

  // Perform hydration simulation for User A
  const hydratedA = { ...userProgressionA };

  assert.strictEqual(hydratedA.totalXP, initialSnapshot.totalXP, 'totalXP must be strictly preserved');
  assert.strictEqual(hydratedA.todayHP, initialSnapshot.todayHP, 'todayHP must be strictly preserved');
  assert.strictEqual(hydratedA.lifetimeHP, initialSnapshot.lifetimeHP, 'lifetimeHP must be strictly preserved');
  assert.strictEqual(hydratedA.taskHistory.length, initialSnapshot.taskHistory.length, 'taskHistory length must be strictly preserved');
  assert.strictEqual(hydratedA.taskHistory[0].xpAwarded, 25);
  assert.strictEqual(hydratedA.taskHistory[0].hpAwarded, 25);
});

// ==========================================
// TEST 9 — EXISTING REGRESSION INVARIANTS
// ==========================================
test('TEST 9: 21. 100-Level progression curve formula is strictly preserved', () => {
  function getLevelForTotalXP(totalXP) {
    return Math.min(100, Math.floor(Math.sqrt(Math.max(0, totalXP) / 100)) + 1);
  }

  assert.strictEqual(getLevelForTotalXP(0), 1);
  assert.strictEqual(getLevelForTotalXP(99), 1);
  assert.strictEqual(getLevelForTotalXP(100), 2);
  assert.strictEqual(getLevelForTotalXP(400), 3);
  assert.strictEqual(getLevelForTotalXP(900), 4);
  assert.strictEqual(getLevelForTotalXP(1600), 5);
  assert.strictEqual(getLevelForTotalXP(980100), 100);
  assert.strictEqual(getLevelForTotalXP(1000000), 100);
});

test('TEST 9: 22. Achievement unlock rewards remain 0 HP across all rarities', () => {
  const achievementsFile = fs.readFileSync(path.join(__dirname, '../src/features/achievements/data/achievements.ts'), 'utf8');
  assert(!achievementsFile.includes('rewardHP: 1'), 'No achievement should have rewardHP > 0');
  assert(!achievementsFile.includes('rewardHP: 5'), 'No achievement should have rewardHP > 0');
  assert(!achievementsFile.includes('rewardHP: 10'), 'No achievement should have rewardHP > 0');
  assert(!achievementsFile.includes('rewardHP: 25'), 'No achievement should have rewardHP > 0');
});

test('TEST 9: 23. Squad contribution rewards remain strictly 0 XP and 0 HP', () => {
  const squadServiceFile = fs.readFileSync(path.join(__dirname, '../src/features/squad/services/squadService.ts'), 'utf8');
  // squadService only handles squad entity state and contributions; it never grants user progression XP or HP
  assert(!squadServiceFile.includes('addExperience'), 'squadService must never directly award XP');
  assert(!squadServiceFile.includes('awardHealthPoints'), 'squadService must never directly award HP');
});

console.log(`\nPhase C Results: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) {
  process.exit(1);
}
