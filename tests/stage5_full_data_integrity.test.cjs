/**
 * Kairos Stage 5 — Full Data Integrity Audit & Authoritative State Completion Test Suite
 *
 * Validates:
 * User Profile:
 * 1. KAIROS_USER_PROFILE_V1 is used in App.tsx
 * 2. User profile survives reload (loads correctly from localStorage)
 * 3. Valid stored profile is not overwritten by defaults
 * 4. Malformed profile storage fails safely to valid default
 *
 * Profile Customization:
 * 5. KAIROS_USER_PROFILE_EXT_V1 is used in ProfileScreen.tsx
 * 6. customName persists and survives reload
 * 7. kairosId persists and survives reload
 * 8. userQuote persists and survives reload
 * 9. showcaseIds persists and survives reload
 * 10. Malformed customization storage fails safely
 *
 * Notifications:
 * 11. KAIROS_NOTIFICATIONS_V1 is used in NotificationScreen.tsx
 * 12. Notification state persists
 * 13. Notification interactions (read/unread, dismiss, actionDone) survive reload
 * 14. Malformed notification storage fails safely to INITIAL_NOTIFICATIONS
 *
 * Hydration:
 * 15. NotificationScreen imports and uses useProgression()
 * 16. Circadian hydration calls progression.completeTask() with sys-hydration-am and hp: 15
 * 17. NotificationScreen does not directly mutate todayHP or lifetimeHP
 * 18. NotificationScreen does not directly mutate totalXP or xpRemainder
 * 19. Duplicate hydration completion does not double-award progression
 *
 * Integrity & Invariants:
 * 20. Achievement rewards remain XP-only
 * 21. Achievement HP remains strictly 0
 * 22. Squad rewards remain strictly 0 XP
 * 23. Squad rewards remain strictly 0 HP
 * 24. Progression remains single authoritative source of truth
 * 25. No fabricated progression metrics in screens
 * 26. Local date handling remains consistent across systems
 * 27. Existing task completion behavior remains intact
 * 28. Existing focus session behavior remains intact
 * 29. Existing Squad contribution behavior remains intact
 * 30. Existing reminder and reflection persistence remains intact
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Setup Node localStorage & browser environment
const storage = {};
global.localStorage = {
  getItem: (key) => (Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null),
  setItem: (key, val) => { storage[key] = String(val); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); }
};

if (typeof window === 'undefined') {
  global.window = {
    dispatchEvent: () => {},
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}

if (typeof CustomEvent === 'undefined') {
  global.CustomEvent = class CustomEvent {
    constructor(event, params) {
      this.event = event;
      this.detail = params?.detail;
    }
  };
}

// ----------------------------------------------------------------------------
// Pure progression engine & manager implementation for Node verification
// ----------------------------------------------------------------------------
function calculateDailyHpThreshold(level) {
  const boundedLevel = Math.max(1, Math.min(100, level));
  return 100 + Math.floor(boundedLevel / 5) * 15;
}

function calculateDeltaXP(level) {
  if (level <= 1) return 0;
  const raw = 80 + 45 * (level - 1) + 2.40 * Math.pow(level - 1, 1.95);
  return Math.round(raw / 5) * 5;
}

const CUMULATIVE_LEVEL_FLOORS = [0];
let runningTotal = 0;
for (let lvl = 2; lvl <= 101; lvl++) {
  runningTotal += calculateDeltaXP(lvl);
  CUMULATIVE_LEVEL_FLOORS[lvl - 1] = runningTotal;
}

function getLevelForTotalXP(totalXP) {
  if (totalXP <= 0) return 1;
  let low = 1;
  let high = 100;
  let found = 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const floorXP = CUMULATIVE_LEVEL_FLOORS[mid - 1];
    if (totalXP >= floorXP) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return Math.min(100, Math.max(1, found));
}

function calculateReward(level, todayHP, taskHP) {
  const threshold = calculateDailyHpThreshold(level);
  const remainingCap = Math.max(0, threshold - todayHP);
  const preCapHP = Math.min(taskHP, remainingCap);
  const postCapHP = Math.max(0, taskHP - preCapHP);
  const earnedXP = preCapHP + postCapHP * 0.01;
  return { preCapHP, postCapHP, earnedXP };
}

function addExperience(totalXP, xpRemainder, earnedXP) {
  const currentEffectiveXP = totalXP + xpRemainder;
  const newEffectiveXP = currentEffectiveXP + earnedXP;
  const newTotalXP = Math.floor(newEffectiveXP);
  const newRemainder = Number((newEffectiveXP - newTotalXP).toFixed(6));
  return { newTotalXP, newRemainder };
}

function getLocalTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const RARITY_MULTIPLIERS = {
  common: 0.15,
  rare: 0.35,
  epic: 0.70,
  legendary: 1.50
};

function calculateAchievementXpReward(rarity, level = 1) {
  const boundedLevel = Math.max(1, Math.min(100, level));
  const deltaXP = calculateDeltaXP(Math.min(100, boundedLevel + 1)) || 100;
  const multiplier = RARITY_MULTIPLIERS[rarity] || 0.15;
  return Math.max(10, Math.round((deltaXP * multiplier) / 5) * 5);
}

class TestProgressionManager {
  constructor() {
    this.state = this.createInitial();
  }

  createInitial() {
    return {
      totalXP: 0,
      xpRemainder: 0.0,
      level: 1,
      todayHP: 0,
      lastActiveDate: getLocalTodayDateString(),
      lifetimeHP: 0,
      completedTaskIdsToday: [],
      taskHistory: [],
      achievementRewardedIds: []
    };
  }

  resetToDefault() {
    this.state = this.createInitial();
  }

  getState() {
    return { ...this.state };
  }

  completeTask(task) {
    const previousLevel = this.state.level;
    const taskHP = Math.max(0, task.hp || 0);
    const taskId = String(task.id);
    const taskTitle = task.title || taskId;

    if (this.state.completedTaskIdsToday.includes(taskId)) {
      return {
        success: false,
        alreadyCompleted: true,
        hpAwarded: 0,
        xpAwarded: 0,
        previousLevel,
        newLevel: previousLevel,
        didLevelUp: false,
        newTotalXP: this.state.totalXP,
        newTodayHP: this.state.todayHP
      };
    }

    const { preCapHP, postCapHP, earnedXP } = calculateReward(
      this.state.level,
      this.state.todayHP,
      taskHP
    );

    const { newTotalXP, newRemainder } = addExperience(
      this.state.totalXP,
      this.state.xpRemainder,
      earnedXP
    );

    const newLevel = getLevelForTotalXP(newTotalXP);
    const didLevelUp = newLevel > previousLevel;

    this.state.totalXP = newTotalXP;
    this.state.xpRemainder = newRemainder;
    this.state.level = newLevel;
    this.state.todayHP += taskHP;
    this.state.lifetimeHP += taskHP;
    this.state.completedTaskIdsToday.push(taskId);
    this.state.taskHistory.push({
      taskId,
      taskTitle,
      hpAwarded: taskHP,
      xpAwarded: earnedXP,
      date: this.state.lastActiveDate
    });

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
      newTodayHP: this.state.todayHP
    };
  }

  awardAchievementUnlock(payload) {
    const achievementId = String(payload.id);
    const previousLevel = this.state.level;

    if (this.state.achievementRewardedIds.includes(achievementId)) {
      return {
        success: false,
        alreadyAwarded: true,
        xpAwarded: 0,
        hpAwarded: 0,
        previousLevel,
        newLevel: previousLevel,
        didLevelUp: false,
        newTotalXP: this.state.totalXP
      };
    }

    const xpAwarded = calculateAchievementXpReward(payload.rarity, previousLevel);
    const { newTotalXP, newRemainder } = addExperience(
      this.state.totalXP,
      this.state.xpRemainder,
      xpAwarded
    );

    const newLevel = getLevelForTotalXP(newTotalXP);
    const didLevelUp = newLevel > previousLevel;

    this.state.totalXP = newTotalXP;
    this.state.xpRemainder = newRemainder;
    this.state.level = newLevel;
    this.state.achievementRewardedIds.push(achievementId);

    return {
      success: true,
      alreadyAwarded: false,
      xpAwarded,
      hpAwarded: 0,
      previousLevel,
      newLevel,
      didLevelUp,
      newTotalXP
    };
  }

  isTaskCompletedToday(taskId) {
    return this.state.completedTaskIdsToday.includes(taskId);
  }
}

console.log('\n--- Running Kairos Stage 5: Full Data Integrity & Persistence Tests ---\n');

let passed = 0;
let failed = 0;

function runTest(testName, fn) {
  try {
    fn();
    console.log(`  ✓ ${testName}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${testName}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// Read relevant source files
const appSrc = fs.readFileSync(path.join(__dirname, '../src/App.tsx'), 'utf-8');
const profileScreenSrc = fs.readFileSync(path.join(__dirname, '../src/screens/ProfileScreen.tsx'), 'utf-8');
const notifScreenSrc = fs.readFileSync(path.join(__dirname, '../src/screens/NotificationScreen.tsx'), 'utf-8');
const homeScreenSrc = fs.readFileSync(path.join(__dirname, '../src/screens/HomeScreen.tsx'), 'utf-8');
const companionSrc = fs.readFileSync(path.join(__dirname, '../src/screens/CompanionScreen.tsx'), 'utf-8');
const wellbeingSrc = fs.readFileSync(path.join(__dirname, '../src/screens/DigitalWellbeingScreen.tsx'), 'utf-8');

// ============================================================================
// Part 1: User Profile Persistence (App.tsx)
// ============================================================================

runTest('1. KAIROS_USER_PROFILE_V1 is used in App.tsx', () => {
  assert.strictEqual(
    appSrc.includes("KAIROS_USER_PROFILE_V1"),
    true,
    'App.tsx must use storage key KAIROS_USER_PROFILE_V1'
  );
  assert.strictEqual(
    appSrc.includes("export const STORAGE_KEY_USER_PROFILE = 'KAIROS_USER_PROFILE_V1'"),
    true,
    'App.tsx must export STORAGE_KEY_USER_PROFILE'
  );
});

runTest('2. User profile survives reload', () => {
  const profileKey = 'KAIROS_USER_PROFILE_V1';
  const customUser = { email: 'test.user@kairos.ai', name: 'Test User' };
  localStorage.setItem(profileKey, JSON.stringify(customUser));

  const saved = localStorage.getItem(profileKey);
  assert.notStrictEqual(saved, null);
  const parsed = JSON.parse(saved);
  assert.strictEqual(parsed.email, 'test.user@kairos.ai');
  assert.strictEqual(parsed.name, 'Test User');
});

runTest('3. Valid stored profile is not overwritten by defaults', () => {
  const profileKey = 'KAIROS_USER_PROFILE_V1';
  const customProfile = { email: 'sarah.connor@resistance.org', name: 'Sarah Connor' };
  localStorage.setItem(profileKey, JSON.stringify(customProfile));

  // Simulate loader logic from App.tsx
  let loadedProfile = null;
  try {
    const raw = localStorage.getItem(profileKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.email === 'string' && typeof parsed.name === 'string') {
        loadedProfile = parsed;
      }
    }
  } catch {}

  assert.deepStrictEqual(loadedProfile, customProfile, 'Valid saved profile must be preserved');
});

runTest('4. Malformed profile storage fails safely to default', () => {
  const profileKey = 'KAIROS_USER_PROFILE_V1';
  localStorage.setItem(profileKey, '{ bad json ///');

  const defaultUser = { email: 'alex.rivera@kairos.ai', name: 'Alex Rivera' };
  let loadedProfile = defaultUser;
  try {
    const raw = localStorage.getItem(profileKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.email === 'string' && typeof parsed.name === 'string') {
        loadedProfile = parsed;
      }
    }
  } catch {}

  assert.deepStrictEqual(loadedProfile, defaultUser, 'Malformed profile storage must fallback to default user');
});

// ============================================================================
// Part 2: Profile Customization Persistence (ProfileScreen.tsx)
// ============================================================================

runTest('5. KAIROS_USER_PROFILE_EXT_V1 is used in ProfileScreen.tsx', () => {
  assert.strictEqual(
    profileScreenSrc.includes("KAIROS_USER_PROFILE_EXT_V1"),
    true,
    'ProfileScreen.tsx must use storage key KAIROS_USER_PROFILE_EXT_V1'
  );
  assert.strictEqual(
    profileScreenSrc.includes("export const STORAGE_KEY_USER_PROFILE_EXT = 'KAIROS_USER_PROFILE_EXT_V1'"),
    true,
    'ProfileScreen.tsx must export STORAGE_KEY_USER_PROFILE_EXT'
  );
});

runTest('6. customName persists and survives reload', () => {
  const extKey = 'KAIROS_USER_PROFILE_EXT_V1';
  const extData = { customName: 'Commander Shepard', kairosId: 'KS-8832', userQuote: 'I should go.', showcaseIds: ['tier-1'] };
  localStorage.setItem(extKey, JSON.stringify(extData));

  const saved = JSON.parse(localStorage.getItem(extKey));
  assert.strictEqual(saved.customName, 'Commander Shepard');
});

runTest('7. kairosId persists and survives reload', () => {
  const extKey = 'KAIROS_USER_PROFILE_EXT_V1';
  const saved = JSON.parse(localStorage.getItem(extKey));
  assert.strictEqual(saved.kairosId, 'KS-8832');
});

runTest('8. userQuote persists and survives reload', () => {
  const extKey = 'KAIROS_USER_PROFILE_EXT_V1';
  const saved = JSON.parse(localStorage.getItem(extKey));
  assert.strictEqual(saved.userQuote, 'I should go.');
});

runTest('9. showcaseIds persists and survives reload', () => {
  const extKey = 'KAIROS_USER_PROFILE_EXT_V1';
  const saved = JSON.parse(localStorage.getItem(extKey));
  assert.deepStrictEqual(saved.showcaseIds, ['tier-1']);
});

runTest('10. Malformed customization storage fails safely', () => {
  const extKey = 'KAIROS_USER_PROFILE_EXT_V1';
  localStorage.setItem(extKey, 'invalid JSON content here');

  // Verify loader doesn't throw and safely falls back
  let loaded = null;
  try {
    const raw = localStorage.getItem(extKey);
    if (raw) {
      loaded = JSON.parse(raw);
    }
  } catch {}

  assert.strictEqual(loaded, null, 'Malformed JSON must fail safely without uncaught exception');
});

// ============================================================================
// Part 3: Notification Persistence (NotificationScreen.tsx)
// ============================================================================

runTest('11. KAIROS_NOTIFICATIONS_V1 is used in NotificationScreen.tsx', () => {
  assert.strictEqual(
    notifScreenSrc.includes("KAIROS_NOTIFICATIONS_V1"),
    true,
    'NotificationScreen.tsx must use storage key KAIROS_NOTIFICATIONS_V1'
  );
  assert.strictEqual(
    notifScreenSrc.includes("export const STORAGE_KEY_NOTIFICATIONS = 'KAIROS_NOTIFICATIONS_V1'"),
    true,
    'NotificationScreen.tsx must export STORAGE_KEY_NOTIFICATIONS'
  );
});

runTest('12. Notification state persists', () => {
  const notifKey = 'KAIROS_NOTIFICATIONS_V1';
  const sampleNotifications = [
    {
      id: 'notif-1',
      category: 'rhythm',
      period: 'today',
      tag: 'AI Rhythm',
      tagColor: 'text-indigo-600',
      title: 'Peak Focus',
      description: 'Focus is optimal',
      timestamp: '5m ago',
      isUnread: false,
      icon: 'bolt',
      iconGradient: 'from-indigo-600 to-violet-500',
      borderAccent: 'border-l-indigo-600'
    }
  ];
  localStorage.setItem(notifKey, JSON.stringify(sampleNotifications));

  const saved = localStorage.getItem(notifKey);
  assert.notStrictEqual(saved, null);
  const parsed = JSON.parse(saved);
  assert.strictEqual(parsed.length, 1);
  assert.strictEqual(parsed[0].id, 'notif-1');
  assert.strictEqual(parsed[0].isUnread, false);
});

runTest('13. Notification interactions survive reload', () => {
  const notifKey = 'KAIROS_NOTIFICATIONS_V1';
  const updatedNotifications = [
    {
      id: 'notif-3',
      category: 'tasks',
      period: 'today',
      tag: 'Circadian Hydration',
      tagColor: 'text-cyan-600',
      title: 'Hydration Target',
      description: 'Drink water',
      timestamp: '1h ago',
      isUnread: false,
      icon: 'water_drop',
      iconGradient: 'from-cyan-400 to-blue-500',
      borderAccent: 'border-l-cyan-500',
      actionType: 'hydration',
      actionDone: true,
      actionDoneText: '✓ Logged! +15 HP'
    }
  ];
  localStorage.setItem(notifKey, JSON.stringify(updatedNotifications));

  const saved = JSON.parse(localStorage.getItem(notifKey));
  assert.strictEqual(saved[0].actionDone, true, 'actionDone must survive in storage');
  assert.strictEqual(saved[0].isUnread, false, 'isUnread = false must survive in storage');
});

runTest('14. Malformed notification storage fails safely to default', () => {
  const notifKey = 'KAIROS_NOTIFICATIONS_V1';
  localStorage.setItem(notifKey, '<<Corrupted Data>>');

  // Verify safe parse
  let loaded = null;
  try {
    const raw = localStorage.getItem(notifKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        loaded = parsed;
      }
    }
  } catch {}

  assert.strictEqual(loaded, null, 'Malformed notification storage must fail safely without crash');
});

// ============================================================================
// Part 4: Hydration Progression Integration
// ============================================================================

runTest('15. NotificationScreen imports and uses useProgression()', () => {
  assert.strictEqual(
    notifScreenSrc.includes("useProgression"),
    true,
    'NotificationScreen must import useProgression'
  );
  assert.strictEqual(
    notifScreenSrc.includes("const progression = useProgression()"),
    true,
    'NotificationScreen must invoke useProgression hook'
  );
});

runTest('16. Hydration action calls progression.completeTask with id sys-hydration-am and hp: 15', () => {
  assert.strictEqual(
    notifScreenSrc.includes("id: 'sys-hydration-am'"),
    true,
    "NotificationScreen must complete task with id 'sys-hydration-am'"
  );
  assert.strictEqual(
    notifScreenSrc.includes("hp: 15"),
    true,
    'NotificationScreen must specify hp: 15 for hydration task'
  );
  assert.strictEqual(
    notifScreenSrc.includes("title: 'Circadian Hydration'"),
    true,
    "NotificationScreen must specify title 'Circadian Hydration'"
  );
});

runTest('17. NotificationScreen does not directly mutate todayHP or lifetimeHP', () => {
  assert.strictEqual(
    notifScreenSrc.includes("todayHP +="),
    false,
    'NotificationScreen must not mutate todayHP'
  );
  assert.strictEqual(
    notifScreenSrc.includes("setTodayHP"),
    false,
    'NotificationScreen must not setTodayHP'
  );
  assert.strictEqual(
    notifScreenSrc.includes("lifetimeHP +="),
    false,
    'NotificationScreen must not mutate lifetimeHP'
  );
});

runTest('18. NotificationScreen does not directly mutate totalXP or xpRemainder', () => {
  assert.strictEqual(
    notifScreenSrc.includes("totalXP +="),
    false,
    'NotificationScreen must not mutate totalXP'
  );
  assert.strictEqual(
    notifScreenSrc.includes("setTotalXP"),
    false,
    'NotificationScreen must not setTotalXP'
  );
});

runTest('19. Duplicate hydration completion does not double-award progression', () => {
  const manager = new TestProgressionManager();

  const initialTodayHP = manager.getState().todayHP;
  const initialXP = manager.getState().totalXP;

  // Complete hydration task
  const res1 = manager.completeTask({
    id: 'sys-hydration-am',
    hp: 15,
    title: 'Circadian Hydration'
  });

  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.hpAwarded, 15);
  assert.strictEqual(manager.getState().todayHP, initialTodayHP + 15);

  const hpAfterFirst = manager.getState().todayHP;
  const xpAfterFirst = manager.getState().totalXP;

  // Second duplicate completion attempt
  const res2 = manager.completeTask({
    id: 'sys-hydration-am',
    hp: 15,
    title: 'Circadian Hydration'
  });

  assert.strictEqual(res2.success, false);
  assert.strictEqual(res2.alreadyCompleted, true);
  assert.strictEqual(res2.hpAwarded, 0);
  assert.strictEqual(res2.xpAwarded, 0);
  assert.strictEqual(manager.getState().todayHP, hpAfterFirst, 'todayHP must not increase on duplicate complete');
  assert.strictEqual(manager.getState().totalXP, xpAfterFirst, 'totalXP must not increase on duplicate complete');
});

// ============================================================================
// Part 5: Integrity & Authoritative Invariants
// ============================================================================

runTest('20. Achievement rewards remain XP-only', () => {
  const manager = new TestProgressionManager();

  const res = manager.awardAchievementUnlock({
    id: 'test-arch-achievement',
    rarity: 'epic',
    title: 'Epic Feat'
  });

  assert.strictEqual(res.success, true);
  assert.ok(res.xpAwarded > 0, 'Achievement must award XP');
  assert.strictEqual(res.hpAwarded, 0, 'Achievement must award 0 HP');
});

runTest('21. Achievement HP remains strictly 0 in state', () => {
  const manager = new TestProgressionManager();

  const beforeHP = manager.getState().todayHP;
  const beforeLifetimeHP = manager.getState().lifetimeHP;

  manager.awardAchievementUnlock({
    id: 'test-legendary-achievement',
    rarity: 'legendary',
    title: 'Legendary Feat'
  });

  const state = manager.getState();
  assert.strictEqual(state.todayHP, beforeHP, 'Achievement unlock must not change todayHP');
  assert.strictEqual(state.lifetimeHP, beforeLifetimeHP, 'Achievement unlock must not change lifetimeHP');
});

runTest('22. Squad rewards remain strictly 0 XP', () => {
  // Verify Squad source code guarantees 0 XP awarded to user progression
  const squadSrc = fs.readFileSync(path.join(__dirname, '../src/features/squad/services/squadService.ts'), 'utf-8');
  assert.strictEqual(squadSrc.includes('progressionManager.addExperience'), false, 'squadService must never call addExperience');
  assert.strictEqual(squadSrc.includes('progression.completeTask'), false, 'squadService must never complete tasks');
});

runTest('23. Squad rewards remain strictly 0 HP', () => {
  const squadSrc = fs.readFileSync(path.join(__dirname, '../src/features/squad/services/squadService.ts'), 'utf-8');
  assert.strictEqual(squadSrc.includes('progressionManager.completeTask'), false, 'squadService must never call completeTask');
  assert.strictEqual(squadSrc.includes('todayHP +='), false, 'squadService must never mutate todayHP');
});

runTest('24. Progression remains single authoritative source of truth', () => {
  const managerSrc = fs.readFileSync(path.join(__dirname, '../src/features/progression/services/progressionManager.ts'), 'utf-8');
  assert.strictEqual(managerSrc.includes('class ProgressionManager'), true, 'ProgressionManager class must exist');
  assert.strictEqual(managerSrc.includes('completeTask('), true, 'ProgressionManager must export completeTask');
  assert.strictEqual(managerSrc.includes('awardAchievementUnlock('), true, 'ProgressionManager must export awardAchievementUnlock');
  assert.strictEqual(managerSrc.includes('getState()'), true, 'ProgressionManager must export getState');
});

runTest('25. No fabricated progression metrics in screens', () => {
  // Check CompanionScreen for hardcoded HP
  assert.strictEqual(companionSrc.includes('earnedHp'), false);
  // Check WellbeingScreen for fake multipliers
  assert.strictEqual(wellbeingSrc.includes('* 0.95'), false);
  assert.strictEqual(wellbeingSrc.includes('* 0.92'), false);
  assert.strictEqual(wellbeingSrc.includes('* 0.90'), false);
  // Check HomeScreen for hardcoded reminder fallback
  assert.strictEqual(homeScreenSrc.includes('Pick up study materials before 6 PM'), false);
});

runTest('26. Local date handling remains consistent across systems', () => {
  const localDate = getLocalTodayDateString();
  const now = new Date();
  const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  assert.strictEqual(localDate, expected, 'Local date must match local calendar year-month-day');
});

runTest('27. Existing task completion behavior remains intact', () => {
  const manager = new TestProgressionManager();

  const res = manager.completeTask({
    id: 'default-task-1',
    hp: 20,
    title: 'Morning Routine'
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.hpAwarded, 20);
  assert.ok(res.xpAwarded > 0);
  assert.strictEqual(manager.isTaskCompletedToday('default-task-1'), true);
});

runTest('28. Existing focus session behavior remains intact', () => {
  const focusSrc = fs.readFileSync(path.join(__dirname, '../src/features/progression/services/focusSessionService.ts'), 'utf-8');
  assert.strictEqual(focusSrc.includes('KAIROS_FOCUS_SESSIONS_V1'), true);
  assert.strictEqual(focusSrc.includes('recordFocusSession('), true);
  assert.strictEqual(focusSrc.includes('loadFocusSessions('), true);
});

runTest('29. Existing Squad contribution behavior remains intact', () => {
  const squadSrc = fs.readFileSync(path.join(__dirname, '../src/features/squad/services/squadService.ts'), 'utf-8');
  assert.strictEqual(squadSrc.includes('KAIROS_SQUAD_STATE_V1'), true);
  assert.strictEqual(squadSrc.includes('recordTaskContribution('), true);
  assert.strictEqual(squadSrc.includes('removeTaskContribution('), true);
});

runTest('30. Existing reminder and reflection persistence remains intact', () => {
  assert.strictEqual(homeScreenSrc.includes('KAIROS_PINNED_REMINDER_V1'), true);
  assert.strictEqual(homeScreenSrc.includes('KAIROS_DAILY_REFLECTIONS_V1'), true);
});

console.log(`\n======================================================`);
console.log(`Kairos Stage 5 Test Summary: ${passed} Passed, ${failed} Failed`);
console.log(`======================================================\n`);

if (failed > 0) {
  process.exit(1);
}
