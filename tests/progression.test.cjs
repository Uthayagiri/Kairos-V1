/**
 * KAIROS 100-LEVEL PROGRESSION SYSTEM TEST SUITE
 * Validates all core requirements and explicit HP threshold / conversion invariants.
 */

const assert = require('assert');

// 1. Re-create pure engine functions directly for standalone Node execution
const PROGRESSION_CONFIG = {
  minLevel: 1,
  maxLevel: 100,
  baseDailyThreshold: 100,
  thresholdInterval: 5,
  thresholdIncreasePer5Levels: 15,
  postThresholdConversionRatio: 100,
  baseDefaultTaskCount: 10,
  taskUnlockInterval: 5,
  maxDefaultTasks: 30,
};

const LEVEL_TITLES = [
  "Initiate Flow", "Awakened Spark", "Rhythm Seeker", "Habit Novice", "Habit Apprentice",
  "Routine Builder", "Diurnal Walker", "Focus Neophyte", "Clarity Seeker", "Habit Practitioner",
  "Steadfast Scholar", "Willpower Forge", "Pacing Adept", "Dawn Strider", "Focus Alchemist",
  "Consistency Sentinel", "Cognitive Artisan", "Rhythm Warden", "Momentum Trainee", "Momentum Navigator",
  "Kinetic Dynamo", "Flow Initiate", "Flow Catalyst", "Action Architect", "Habit Vanguard",
  "Velocity Adept", "Drive Harmonizer", "Tenacity Pathfinder", "Dynamic Pacer", "Momentum Sovereign",
  "Deep Work Aspirant", "Singular Aim", "Attention Artisan", "Clarity Sentinel", "Distraction Slayer",
  "Precision Craftsman", "Intentionalist", "Cognitive Alchemist", "Mental Fortress", "Master of Focus",
  "Self-Author Initiate", "Principle Guide", "Efficiency Virtuoso", "Method Maestro", "Intrinsic Dynamo",
  "Strategic Practitioner", "Excellence Weaver", "Sovereign Thinker", "Life Sculptor", "Grand Alchemist of Habit",
  "Stoic Resilient", "Grit Pathfinder", "Iron Will", "Adaptation Specialist", "Equilibrium Keeper",
  "Unshakable Core", "Pressure Artisan", "Adversity Transmuter", "Tenacity Sovereign", "Fortress of Fortitude",
  "Purpose Architect", "Beacon of Rhythm", "Inspirational Guide", "Vision Harmonizer", "Cultural Catalyst",
  "Strategic Visionary", "Empathy Sovereign", "Synergy Conductor", "Guiding Luminary", "Epoch Master",
  "Philosophic Sage", "Equanimity Seeker", "Insight Adept", "Reflective Anchor", "Mindful Sovereign",
  "Balance Architect", "Cognitive Luminary", "Quiet Storm", "Deep Perspective", "Sage of Equilibrium",
  "Holistic Integrator", "Universal Pacer", "Temporal Strategist", "Zenith Voyager", "Flow Celestial",
  "Living Chronos", "Elysian Architect", "Timeless Sovereign", "Astral Luminary", "Ascendant Sovereign",
  "Cosmic Weaver", "Chronos Vanguard", "Primordial Focus", "Solar Sovereign", "Universal Sentinel",
  "Omni Rhythm", "Infinite Flow", "Kairos Sovereign", "Apex Transcendence", "Aion Prime: The Kairos Omniscient"
];

function calculateDeltaXP(level) {
  if (level <= 1) return 0;
  const raw = 80 + 45 * (level - 1) + 2.40 * Math.pow(level - 1, 1.95);
  return Math.round(raw / 5) * 5;
}

function calculateDailyHpThreshold(level) {
  const boundedLevel = Math.max(1, Math.min(100, level));
  return 100 + Math.floor(boundedLevel / 5) * 15;
}

function calculateDefaultTaskCount(level) {
  const boundedLevel = Math.max(1, Math.min(100, level));
  if (boundedLevel >= 100) return 30;
  return Math.min(30, 10 + Math.floor((boundedLevel - 1) / 5));
}

const CUMULATIVE_XP_TABLE = [0];
let runningSum = 0;
for (let lvl = 1; lvl <= 100; lvl++) {
  runningSum += calculateDeltaXP(lvl);
  CUMULATIVE_XP_TABLE.push(runningSum);
}

function getLevelForTotalXP(totalXP) {
  if (totalXP <= 0) return 1;
  let currentLevel = 1;
  for (let lvl = 2; lvl <= 100; lvl++) {
    if (totalXP >= CUMULATIVE_XP_TABLE[lvl]) {
      currentLevel = lvl;
    } else {
      break;
    }
  }
  return Math.min(100, currentLevel);
}

function calculateReward(currentLevel, todayHP, taskHP) {
  const threshold = calculateDailyHpThreshold(currentLevel);
  const cleanTaskHP = Math.max(0, taskHP);
  const currentTodayHP = Math.max(0, todayHP);

  if (currentTodayHP >= threshold) {
    const preCapHP = 0;
    const postCapHP = cleanTaskHP;
    const earnedXP = Number((postCapHP * 0.01).toFixed(6));
    return { preCapHP, postCapHP, earnedXP };
  }

  const hpSpace = threshold - currentTodayHP;

  if (cleanTaskHP <= hpSpace) {
    const preCapHP = cleanTaskHP;
    const postCapHP = 0;
    const earnedXP = preCapHP * 1.0;
    return { preCapHP, postCapHP, earnedXP };
  }

  const preCapHP = hpSpace;
  const postCapHP = cleanTaskHP - hpSpace;
  const earnedXP = Number((preCapHP * 1.0 + postCapHP * 0.01).toFixed(6));
  return { preCapHP, postCapHP, earnedXP };
}

function addExperience(currentTotalXP, currentRemainder, earnedXP) {
  const cleanRemainder = Math.max(0, Math.min(0.999999, currentRemainder || 0));
  const cleanEarned = Math.max(0, earnedXP || 0);

  const totalCombined = cleanRemainder + cleanEarned;
  const wholeGained = Math.floor(totalCombined);
  const newRemainder = Number((totalCombined - wholeGained).toFixed(6));
  const newTotalXP = Math.max(0, currentTotalXP + wholeGained);

  return { newTotalXP, newRemainder, wholeGained };
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

  if (!activeDates.has(todayDateStr)) {
    return 0;
  }

  let streak = 1;
  let cursorStr = todayDateStr;

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

// In-Memory Test Manager for State Tests
class TestProgressionManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      totalXP: 0,
      xpRemainder: 0.0,
      level: 1,
      todayHP: 0,
      lastActiveDate: '2026-09-19',
      lifetimeHP: 0,
      completedTaskIdsToday: [],
      taskHistory: [],
      levelUpHistory: []
    };
  }

  getCurrentStreak(customDate) {
    return calculateCurrentStreak(this.state.taskHistory, customDate || this.state.lastActiveDate);
  }

  completeTask(task) {
    const taskId = String(task.id);
    const taskHP = Math.max(0, task.hp);

    // 1. Idempotency check: verify task hasn't already been completed today
    if (this.state.completedTaskIdsToday.includes(taskId)) {
      return {
        success: false,
        alreadyCompleted: true,
        hpAwarded: 0,
        xpAwarded: 0,
        newTotalXP: this.state.totalXP,
        newXpRemainder: this.state.xpRemainder,
        newTodayHP: this.state.todayHP,
        lifetimeHP: this.state.lifetimeHP
      };
    }

    // 2. Calculate HP reward and XP conversion considering daily threshold
    const { preCapHP, postCapHP, earnedXP } = calculateReward(
      this.state.level,
      this.state.todayHP,
      taskHP
    );

    // 3. Add FULL task HP to todayHP and lifetimeHP (no clamping)
    this.state.todayHP += taskHP;
    this.state.lifetimeHP += taskHP;

    // 4. Accumulate XP preserving exact fractional remainder
    const { newTotalXP, newRemainder } = addExperience(
      this.state.totalXP,
      this.state.xpRemainder,
      earnedXP
    );

    // 5. Determine new level
    const newLevel = getLevelForTotalXP(newTotalXP);

    this.state.totalXP = newTotalXP;
    this.state.xpRemainder = newRemainder;
    this.state.level = newLevel;
    this.state.completedTaskIdsToday.push(taskId);

    // Record task history
    this.state.taskHistory.push({
      taskId,
      taskTitle: task.title || taskId,
      hpAwarded: taskHP,
      xpAwarded: earnedXP,
      completedAt: new Date().toISOString(),
      date: this.state.lastActiveDate
    });

    return {
      success: true,
      alreadyCompleted: false,
      hpAwarded: taskHP,
      xpAwarded: earnedXP,
      preCapHP,
      postCapHP,
      newTotalXP,
      newXpRemainder: newRemainder,
      newTodayHP: this.state.todayHP,
      lifetimeHP: this.state.lifetimeHP
    };
  }

  simulateNewDay(newDate) {
    this.state.lastActiveDate = newDate;
    this.state.todayHP = 0;
    this.state.completedTaskIdsToday = [];
  }
}

// RUN THE COMPREHENSIVE TEST SUITE
console.log('====================================================');
console.log('KAIROS 100-LEVEL PROGRESSION & STREAK TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 27;

function test(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(err);
  }
}

// TEST 1: 10 HP task before threshold
test('Test 1: 10 HP task before threshold: +10 HP, +10 XP', () => {
  const reward = calculateReward(1, 0, 10);
  assert.strictEqual(reward.preCapHP, 10);
  assert.strictEqual(reward.postCapHP, 0);
  assert.strictEqual(reward.earnedXP, 10);
});

// TEST 2: 10 HP task after threshold
test('Test 2: 10 HP task after threshold: +10 HP, +0.1 XP', () => {
  const reward = calculateReward(1, 100, 10);
  assert.strictEqual(reward.preCapHP, 0);
  assert.strictEqual(reward.postCapHP, 10);
  assert.strictEqual(reward.earnedXP, 0.1);
});

// TEST 3: 90 HP -> 20 HP task with threshold 100: +20 HP, +10.1 XP
test('Test 3: 90 HP -> 20 HP task with threshold 100: +20 HP, +10.1 XP', () => {
  const reward = calculateReward(1, 90, 20);
  assert.strictEqual(reward.preCapHP, 10);
  assert.strictEqual(reward.postCapHP, 10);
  assert.strictEqual(reward.earnedXP, 10.1);
});

// TEST 4: Fractional accumulation: 0.2 + 0.3 + 0.5 = exactly +1 XP
test('Test 4: Fractional accumulation: 0.2 + 0.3 + 0.5 = exactly +1 XP', () => {
  let acc = addExperience(0, 0.0, 0.2);
  assert.strictEqual(acc.newTotalXP, 0);
  assert.strictEqual(acc.newRemainder, 0.2);

  acc = addExperience(acc.newTotalXP, acc.newRemainder, 0.3);
  assert.strictEqual(acc.newTotalXP, 0);
  assert.strictEqual(acc.newRemainder, 0.5);

  acc = addExperience(acc.newTotalXP, acc.newRemainder, 0.5);
  assert.strictEqual(acc.newTotalXP, 1);
  assert.strictEqual(acc.newRemainder, 0.0);
});

// TEST 5: Fractional remainder survives a new day
test('Test 5: Fractional remainder survives a new day', () => {
  const mgr = new TestProgressionManager();
  // Complete a task after threshold that leaves 0.15 remainder
  mgr.state.todayHP = 100; // at threshold
  mgr.completeTask({ id: 't1', hp: 15 }); // 15 HP * 0.01 = 0.15 XP
  assert.strictEqual(mgr.state.xpRemainder, 0.15);
  assert.strictEqual(mgr.state.totalXP, 0);

  // New day rollover
  mgr.simulateNewDay('2026-09-20');
  assert.strictEqual(mgr.state.xpRemainder, 0.15); // Preserved!
  assert.strictEqual(mgr.state.todayHP, 0); // Reset
});

// TEST 6: Duplicate task completion: second completion gives 0 additional HP/XP
test('Test 6: Duplicate task completion: second completion gives 0 additional HP/XP', () => {
  const mgr = new TestProgressionManager();
  const res1 = mgr.completeTask({ id: 'task_01', hp: 10 });
  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.alreadyCompleted, false);
  assert.strictEqual(res1.hpAwarded, 10);
  assert.strictEqual(res1.xpAwarded, 10);

  const res2 = mgr.completeTask({ id: 'task_01', hp: 10 });
  assert.strictEqual(res2.success, false);
  assert.strictEqual(res2.alreadyCompleted, true);
  assert.strictEqual(res2.hpAwarded, 0);
  assert.strictEqual(res2.xpAwarded, 0);
  assert.strictEqual(mgr.state.todayHP, 10);
});

// TEST 7: New calendar day: todayHP and daily completion state reset
test('Test 7: New calendar day: todayHP and daily completion state reset', () => {
  const mgr = new TestProgressionManager();
  mgr.completeTask({ id: 'task_01', hp: 10 });
  assert.strictEqual(mgr.state.todayHP, 10);
  assert.strictEqual(mgr.state.completedTaskIdsToday.length, 1);

  mgr.simulateNewDay('2026-09-20');
  assert.strictEqual(mgr.state.todayHP, 0);
  assert.strictEqual(mgr.state.completedTaskIdsToday.length, 0);
});

// TEST 8: Lifetime XP survives daily reset
test('Test 8: Lifetime XP survives daily reset', () => {
  const mgr = new TestProgressionManager();
  mgr.completeTask({ id: 'task_01', hp: 10 }); // +10 XP
  mgr.completeTask({ id: 'task_02', hp: 10 }); // +10 XP
  assert.strictEqual(mgr.state.totalXP, 20);

  mgr.simulateNewDay('2026-09-20');
  assert.strictEqual(mgr.state.totalXP, 20); // Still 20 XP!
});

// TEST 9: Level calculation matches the approved 100-level specification
test('Test 9: Level calculation matches the approved 100-level specification', () => {
  assert.strictEqual(getLevelForTotalXP(0), 1);
  assert.strictEqual(getLevelForTotalXP(124), 1);
  assert.strictEqual(getLevelForTotalXP(125), 2);
  assert.strictEqual(getLevelForTotalXP(835), 5);
  assert.strictEqual(getLevelForTotalXP(3365), 10);
  assert.strictEqual(getLevelForTotalXP(25610), 25);
  assert.strictEqual(getLevelForTotalXP(140225), 50);
  assert.strictEqual(getLevelForTotalXP(401965), 75);
  assert.strictEqual(getLevelForTotalXP(867415), 100);
  assert.strictEqual(getLevelForTotalXP(900000), 100); // capped at 100
});

// TEST 10: Default task count: First 5 levels strictly 10 tasks (L1-L5 = 10), then +1 task every 5 levels (L6 = 11, L11 = 12, L51 = 20, L100 = 30)
test('Test 10: Default task count: L1-L5=10, L6-L10=11, L11=12, L51=20, L100=30', () => {
  assert.strictEqual(calculateDefaultTaskCount(1), 10);
  assert.strictEqual(calculateDefaultTaskCount(4), 10);
  assert.strictEqual(calculateDefaultTaskCount(5), 10); // Strictly 10 tasks for first 5 levels
  assert.strictEqual(calculateDefaultTaskCount(6), 11); // +1 task starting at Level 6
  assert.strictEqual(calculateDefaultTaskCount(10), 11);
  assert.strictEqual(calculateDefaultTaskCount(11), 12);
  assert.strictEqual(calculateDefaultTaskCount(50), 19);
  assert.strictEqual(calculateDefaultTaskCount(51), 20);
  assert.strictEqual(calculateDefaultTaskCount(96), 29);
  assert.strictEqual(calculateDefaultTaskCount(100), 30);
});

// TEST 11: Crossing the threshold at 95/100 with a 20 HP task: +20 HP and +5.15 XP
test('Test 11: Crossing threshold at 95/100 with 20 HP task: +20 HP and +5.15 XP', () => {
  const reward = calculateReward(1, 95, 20);
  assert.strictEqual(reward.preCapHP, 5);
  assert.strictEqual(reward.postCapHP, 15);
  assert.strictEqual(reward.earnedXP, 5.15);
});

// TEST 12: Task HP value remains unchanged regardless of level
test('Test 12: Task HP value remains unchanged regardless of level', () => {
  const rewardL1 = calculateReward(1, 0, 20);
  const rewardL50 = calculateReward(50, 0, 20);
  const rewardL100 = calculateReward(100, 0, 20);

  assert.strictEqual(rewardL1.preCapHP + rewardL1.postCapHP, 20);
  assert.strictEqual(rewardL50.preCapHP + rewardL50.postCapHP, 20);
  assert.strictEqual(rewardL100.preCapHP + rewardL100.postCapHP, 20);
});

// =========================================================================
// EXPLICIT HP ACCUMULATION & THRESHOLD CONVERSION INVARIANT TESTS
// =========================================================================

// TEST 13: Threshold exactly reached (90 HP + 10 HP task = 100 HP, +10 lifetimeHP, +10 XP)
test('Test 13: Threshold exactly reached (90 HP + 10 HP task = 100 HP, +10 lifetimeHP, +10 XP)', () => {
  const mgr = new TestProgressionManager();
  mgr.state.todayHP = 90;
  mgr.state.lifetimeHP = 500;

  const res = mgr.completeTask({ id: 'task_reach_threshold', hp: 10 });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.newTodayHP, 100);
  assert.strictEqual(mgr.state.todayHP, 100);
  assert.strictEqual(mgr.state.lifetimeHP, 510);
  assert.strictEqual(res.xpAwarded, 10.0);
});

// TEST 14: Post-threshold task (100 HP + 20 HP task = 120 HP, +20 lifetimeHP, +0.2 XP)
test('Test 14: Post-threshold task (100 HP + 20 HP task = 120 HP, +20 lifetimeHP, +0.2 XP)', () => {
  const mgr = new TestProgressionManager();
  mgr.state.todayHP = 100;
  mgr.state.lifetimeHP = 1000;

  const res = mgr.completeTask({ id: 'task_post_threshold', hp: 20 });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.newTodayHP, 120);
  assert.strictEqual(mgr.state.todayHP, 120);
  assert.strictEqual(mgr.state.lifetimeHP, 1020);
  assert.strictEqual(res.xpAwarded, 0.2);
});

// TEST 15: Multiple post-threshold tasks (120 HP + 30 HP task = 150 HP, +30 lifetimeHP, +0.3 XP)
test('Test 15: Multiple post-threshold tasks (120 HP + 30 HP task = 150 HP, +30 lifetimeHP, +0.3 XP)', () => {
  const mgr = new TestProgressionManager();
  mgr.state.todayHP = 120;
  mgr.state.lifetimeHP = 1020;

  const res = mgr.completeTask({ id: 'task_post_multiple', hp: 30 });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.newTodayHP, 150);
  assert.strictEqual(mgr.state.todayHP, 150);
  assert.strictEqual(mgr.state.lifetimeHP, 1050);
  assert.strictEqual(res.xpAwarded, 0.3);
});

// TEST 16: Threshold crossing (90 HP + 20 HP task = 110 HP, +20 lifetimeHP, +10.1 XP)
test('Test 16: Threshold crossing (90 HP + 20 HP task = 110 HP, +20 lifetimeHP, +10.1 XP)', () => {
  const mgr = new TestProgressionManager();
  mgr.state.todayHP = 90;
  mgr.state.lifetimeHP = 400;

  const res = mgr.completeTask({ id: 'task_cross_threshold', hp: 20 });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.newTodayHP, 110);
  assert.strictEqual(mgr.state.todayHP, 110);
  assert.strictEqual(mgr.state.lifetimeHP, 420);
  assert.strictEqual(res.xpAwarded, 10.1);
});

// TEST 17: Lifetime HP continues accumulating far above threshold (todayHP 300 + 50 HP = 350 HP, +50 lifetimeHP, +0.5 XP)
test('Test 17: Lifetime HP continues accumulating far above threshold (300 HP + 50 HP = 350 HP, +50 lifetimeHP, +0.5 XP)', () => {
  const mgr = new TestProgressionManager();
  mgr.state.todayHP = 300; // Far above threshold of 100
  mgr.state.lifetimeHP = 5000;

  const res = mgr.completeTask({ id: 'task_far_above', hp: 50 });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.newTodayHP, 350);
  assert.strictEqual(mgr.state.todayHP, 350);
  assert.strictEqual(mgr.state.lifetimeHP, 5050);
  assert.strictEqual(res.xpAwarded, 0.5);
});

// =========================================================================
// DETERMINISTIC CURRENT STREAK CALCULATION TESTS
// =========================================================================

// TEST 18 (Streak Test 1): First active day (today completed, yesterday missing -> streak = 1)
test('Test 18 (Streak 1): First active day (today completed, yesterday missing -> streak = 1)', () => {
  const history = [{ date: '2026-09-21', taskId: 't1' }];
  const streak = calculateCurrentStreak(history, '2026-09-21');
  assert.strictEqual(streak, 1);
});

// TEST 19 (Streak Test 2): Consecutive days (today, yesterday, 2d ago, 3d ago -> streak = 4)
test('Test 19 (Streak 2): Consecutive days (today, yesterday, 2d ago, 3d ago -> streak = 4)', () => {
  const history = [
    { date: '2026-09-18', taskId: 't1' },
    { date: '2026-09-19', taskId: 't2' },
    { date: '2026-09-20', taskId: 't3' },
    { date: '2026-09-21', taskId: 't4' }
  ];
  const streak = calculateCurrentStreak(history, '2026-09-21');
  assert.strictEqual(streak, 4);
});

// TEST 20 (Streak Test 3): Missing day in sequence (today, yesterday, 3d ago -> streak = 2)
test('Test 20 (Streak 3): Missing day in sequence (today, yesterday, 3d ago -> streak = 2)', () => {
  const history = [
    { date: '2026-09-18', taskId: 't1' }, // 3 days ago
    { date: '2026-09-20', taskId: 't2' }, // yesterday (Sep 19 missing)
    { date: '2026-09-21', taskId: 't3' }  // today
  ];
  const streak = calculateCurrentStreak(history, '2026-09-21');
  assert.strictEqual(streak, 2);
});

// TEST 21 (Streak Test 4): Duplicate same-day records (today x3, yesterday x2 -> streak = 2)
test('Test 21 (Streak 4): Duplicate same-day records (today x3, yesterday x2 -> streak = 2)', () => {
  const history = [
    { date: '2026-09-20', taskId: 't1' },
    { date: '2026-09-20', taskId: 't2' },
    { date: '2026-09-21', taskId: 't3' },
    { date: '2026-09-21', taskId: 't4' },
    { date: '2026-09-21', taskId: 't5' }
  ];
  const streak = calculateCurrentStreak(history, '2026-09-21');
  assert.strictEqual(streak, 2);
});

// TEST 22 (Streak Test 5): No activity today (yesterday, 2d ago, 3d ago -> streak = 0)
test('Test 22 (Streak 5): No activity today (yesterday, 2d ago, 3d ago -> streak = 0)', () => {
  const history = [
    { date: '2026-09-18', taskId: 't1' },
    { date: '2026-09-19', taskId: 't2' },
    { date: '2026-09-20', taskId: 't3' }
  ];
  const streak = calculateCurrentStreak(history, '2026-09-21');
  assert.strictEqual(streak, 0);
});

// TEST 23 (Streak Test 6): Future dates ignored (future dates, today, yesterday -> streak = 2)
test('Test 23 (Streak 6): Future dates ignored (future dates, today, yesterday -> streak = 2)', () => {
  const history = [
    { date: '2026-09-20', taskId: 't1' },
    { date: '2026-09-21', taskId: 't2' },
    { date: '2026-09-22', taskId: 't3' }, // future date
    { date: '2026-09-23', taskId: 't4' }  // future date
  ];
  const streak = calculateCurrentStreak(history, '2026-09-21');
  assert.strictEqual(streak, 2);
});

// TEST 24 (Streak Test 7): Large historical gap (today, yesterday, 10d ago, 9d ago -> streak = 2)
test('Test 24 (Streak 7): Large historical gap (today, yesterday, 10d ago, 9d ago -> streak = 2)', () => {
  const history = [
    { date: '2026-09-10', taskId: 't1' },
    { date: '2026-09-11', taskId: 't2' },
    { date: '2026-09-20', taskId: 't3' },
    { date: '2026-09-21', taskId: 't4' }
  ];
  const streak = calculateCurrentStreak(history, '2026-09-21');
  assert.strictEqual(streak, 2);
});

// TEST 25 (Streak Test 8): Empty history ([] -> streak = 0)
test('Test 25 (Streak 8): Empty history ([] -> streak = 0)', () => {
  assert.strictEqual(calculateCurrentStreak([], '2026-09-21'), 0);
  assert.strictEqual(calculateCurrentStreak(null, '2026-09-21'), 0);
  assert.strictEqual(calculateCurrentStreak(undefined, '2026-09-21'), 0);
});

// TEST 26 (Streak Test 9): Manager persistence and reload preserves calculated streak
test('Test 26 (Streak 9): Manager persistence and reload preserves calculated streak', () => {
  const mgr = new TestProgressionManager();
  mgr.state.lastActiveDate = '2026-09-20';
  mgr.completeTask({ id: 't_yest', hp: 20 });
  
  mgr.simulateNewDay('2026-09-21');
  assert.strictEqual(mgr.getCurrentStreak('2026-09-21'), 0); // No task yet today
  
  mgr.completeTask({ id: 't_today', hp: 30 });
  assert.strictEqual(mgr.getCurrentStreak('2026-09-21'), 2); // 2-day streak
  
  // Re-simulate reload from serialized JSON
  const serialized = JSON.stringify(mgr.state);
  const reloadedMgr = new TestProgressionManager();
  reloadedMgr.state = JSON.parse(serialized);
  assert.strictEqual(reloadedMgr.getCurrentStreak('2026-09-21'), 2);
});

// TEST 27 (Streak Test 10): Midnight and date boundary transition
test('Test 27 (Streak 10): Midnight and date boundary transition', () => {
  const mgr = new TestProgressionManager();
  
  // Day 1: Sep 19
  mgr.state.lastActiveDate = '2026-09-19';
  mgr.completeTask({ id: 't1', hp: 20 });
  assert.strictEqual(mgr.getCurrentStreak('2026-09-19'), 1);
  
  // Day 2: Sep 20
  mgr.simulateNewDay('2026-09-20');
  assert.strictEqual(mgr.getCurrentStreak('2026-09-20'), 0); // New day starts at 0 before task
  mgr.completeTask({ id: 't2', hp: 20 });
  assert.strictEqual(mgr.getCurrentStreak('2026-09-20'), 2); // Now 2
  
  // Day 3: Sep 21 (Midnight rollover)
  mgr.simulateNewDay('2026-09-21');
  assert.strictEqual(mgr.getCurrentStreak('2026-09-21'), 0); // New day starts at 0 before task
  mgr.completeTask({ id: 't3', hp: 20 });
  assert.strictEqual(mgr.getCurrentStreak('2026-09-21'), 3); // Now 3
});

console.log('\n====================================================');
console.log(`TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('====================================================');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
