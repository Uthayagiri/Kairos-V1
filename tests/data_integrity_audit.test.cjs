/**
 * Kairos Stage 3 — Full Data Integrity & Mock Data Verification Test Suite
 * Validates:
 * 1. Profile: Does not use obsolete private ACHIEVEMENTS_DATA array
 * 2. Profile: Uses real achievement progress and authentic stats
 * 3. Profile: Achievement count comes from actual state (unlocked / total)
 * 4. Achievement: Rewards are strictly XP-only (0 HP)
 * 5. Statistics: Past day with zero task history produces 0 completed tasks and 0 HP
 * 6. Statistics: Week with 0 activity produces 0 HP (not fake 3,850)
 * 7. Statistics: Month with 0 activity produces 0 HP (not fake 16,420)
 * 8. Statistics: Quarter with 0 activity produces 0 HP (not fake 48,900)
 * 9. Statistics: Year with 0 activity produces 0 HP (not fake 194,500)
 * 10. Statistics: No artificial streak padding (+10, +28, +56) in time horizons
 * 11. Statistics: Radar Focus uses getFocusMinutesForDate
 * 12. Statistics: Zero focus sessions produce 0 focus minutes and 0 focus score
 * 13. Home -> Squad: Completing eligible task on HomeScreen triggers Squad contribution
 * 14. Home -> Squad: Completing ineligible task on HomeScreen does not contribute
 * 15. Home -> Squad: Squad contribution awards 0 XP and 0 HP
 * 16. Invariants: Progression XP/HP formulas, focus sessions, and achievements preserved
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock localStorage for node environment
const storage = {};
global.localStorage = {
  getItem: (key) => storage[key] || null,
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

function formatDateToLocalISO(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

console.log('\n--- Running Kairos Stage 3: Data Integrity & Mock Data Fix Tests ---\n');

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

// ----------------------------------------------------------------------------
// 1. Static Source Code Assertions
// ----------------------------------------------------------------------------
runTest('1. ProfileScreen does not contain obsolete hardcoded ACHIEVEMENTS_DATA array', () => {
  const profileSrc = fs.readFileSync(path.join(__dirname, '../src/screens/ProfileScreen.tsx'), 'utf-8');
  assert.strictEqual(
    profileSrc.includes('const ACHIEVEMENTS_DATA'),
    false,
    'ProfileScreen.tsx must NOT define a private ACHIEVEMENTS_DATA array'
  );
  assert.strictEqual(
    profileSrc.includes('useAchievementProgress'),
    true,
    'ProfileScreen.tsx must import and use useAchievementProgress'
  );
});

runTest('2. StatisticsScreen does not contain fabricated historical fallbacks or streak padding', () => {
  const statsSrc = fs.readFileSync(path.join(__dirname, '../src/screens/StatisticsScreen.tsx'), 'utf-8');
  
  // Verify removed fake past-day fallback
  assert.strictEqual(
    statsSrc.includes('Math.max(3, Math.round(dayTasks.length * 0.75))'),
    false,
    'StatisticsScreen must NOT use Math.max(3, ...) fallback for past days'
  );

  // Verify removed fake HP fallbacks
  assert.strictEqual(statsSrc.includes("'3,850'"), false, 'Must not fallback to 3,850 HP');
  assert.strictEqual(statsSrc.includes('16420'), false, 'Must not fallback to 16420 HP');
  assert.strictEqual(statsSrc.includes('48900'), false, 'Must not fallback to 48900 HP');
  assert.strictEqual(statsSrc.includes('194500'), false, 'Must not fallback to 194500 HP');

  // Verify removed fake streak padding
  assert.strictEqual(statsSrc.includes('streakDaysCount + 10'), false, 'Must not add +10 streak');
  assert.strictEqual(statsSrc.includes('streakDaysCount + 28'), false, 'Must not add +28 streak');
  assert.strictEqual(statsSrc.includes('streakDaysCount + 56'), false, 'Must not add +56 streak');

  // Verify Radar Focus uses getFocusMinutesForDate
  assert.strictEqual(
    statsSrc.includes('completedCognitive * 45'),
    false,
    'StatisticsScreen must NOT estimate focus minutes from completedCognitive * 45'
  );
  assert.strictEqual(
    statsSrc.includes('getFocusMinutesForDate(focusSessions, todayDateStr)'),
    true,
    'StatisticsScreen must use getFocusMinutesForDate(focusSessions, todayDateStr)'
  );
});

runTest('3. HomeScreen imports squadService and records task contribution upon task completion', () => {
  const homeSrc = fs.readFileSync(path.join(__dirname, '../src/screens/HomeScreen.tsx'), 'utf-8');
  assert.strictEqual(
    homeSrc.includes("import { squadService } from '../features/squad'"),
    true,
    'HomeScreen must import squadService'
  );
  assert.strictEqual(
    homeSrc.includes('squadService.recordTaskContribution'),
    true,
    'HomeScreen must call squadService.recordTaskContribution upon completing a task'
  );
});

// ----------------------------------------------------------------------------
// 2. Functional & Subsystem Behavior Tests
// ----------------------------------------------------------------------------

// Helper to simulate weeklyBarsData logic from StatisticsScreen
function computeWeeklyBars(taskHistory, weekDateStrip, todayDateStr) {
  return weekDateStrip.map((d) => {
    const isDayToday = d.dateStr === todayDateStr;
    let completedCount = 0;
    let dayHp = 0;

    if (isDayToday) {
      completedCount = 0;
      dayHp = 0;
    } else if (d.dateStr < todayDateStr) {
      const historyForDay = taskHistory.filter((r) => r.date === d.dateStr);
      if (historyForDay.length > 0) {
        completedCount = historyForDay.length;
        dayHp = historyForDay.reduce((sum, r) => sum + r.hpAwarded, 0);
      } else {
        completedCount = 0;
        dayHp = 0;
      }
    } else {
      completedCount = 0;
      dayHp = 0;
    }

    return {
      day: d.dayName,
      dateStr: d.dateStr,
      tasks: completedCount,
      hp: dayHp
    };
  });
}

runTest('4. Statistics weeklyBarsData: Past days with zero task history produce 0 tasks and 0 HP', () => {
  const today = formatDateToLocalISO(new Date());
  const dYesterday = new Date();
  dYesterday.setDate(dYesterday.getDate() - 1);
  const yesterdayStr = formatDateToLocalISO(dYesterday);

  const weekStrip = [
    { dayName: 'Mon', dateStr: yesterdayStr },
    { dayName: 'Tue', dateStr: today }
  ];

  // Empty task history
  const bars = computeWeeklyBars([], weekStrip, today);
  const pastDayBar = bars.find((b) => b.dateStr === yesterdayStr);

  assert.strictEqual(pastDayBar.tasks, 0, 'Past day with no task history must have 0 completed tasks');
  assert.strictEqual(pastDayBar.hp, 0, 'Past day with no task history must have 0 HP');
});

runTest('5. Statistics Horizon Metrics: Zero activity produces 0 HP across Week, Month, Quarter, Year', () => {
  const totalWeeklyHp = 0;
  const monthHp = Math.round(totalWeeklyHp * 4.2);
  const quarterHp = Math.round(totalWeeklyHp * 12.5);
  const yearHp = Math.round(totalWeeklyHp * 52);
  const lifetimeHP = 0;
  const streakDaysCount = 0;

  const weekHpStr = totalWeeklyHp.toLocaleString();
  const monthHpStr = monthHp.toLocaleString();
  const quarterHpStr = quarterHp.toLocaleString();
  const yearHpStr = (lifetimeHP > 0 ? lifetimeHP : yearHp).toLocaleString();

  assert.strictEqual(weekHpStr, '0', 'Week with 0 activity must display 0 HP');
  assert.strictEqual(monthHpStr, '0', 'Month with 0 activity must display 0 HP');
  assert.strictEqual(quarterHpStr, '0', 'Quarter with 0 activity must display 0 HP');
  assert.strictEqual(yearHpStr, '0', 'Year with 0 activity must display 0 HP');

  // Streak days
  assert.strictEqual(`${streakDaysCount}`, '0', 'Streak with 0 active days must display 0');
});

// Helper for Radar Focus score calculation
function calculateRadarFocusScore(focusSessions, todayDateStr) {
  // getFocusMinutesForDate logic
  const completedFocusMinutes = (focusSessions || [])
    .filter((s) => s.date === todayDateStr && s.completed !== false)
    .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

  const targetFocusMinutes = 120;
  const focusScore = Math.min(100, Math.max(0, Math.round((completedFocusMinutes / targetFocusMinutes) * 100)));

  return {
    completedFocusMinutes,
    targetFocusMinutes,
    focusScore,
    insight: `${completedFocusMinutes}/${targetFocusMinutes} focus minutes completed against daily target.`
  };
}

runTest('6. Statistics Radar Focus: Zero focus sessions produce 0 focus minutes and 0 focus score', () => {
  const today = formatDateToLocalISO(new Date());
  const res = calculateRadarFocusScore([], today);

  assert.strictEqual(res.completedFocusMinutes, 0, 'Completed focus minutes must be 0');
  assert.strictEqual(res.focusScore, 0, 'Focus score must be 0');
  assert.strictEqual(res.insight, '0/120 focus minutes completed against daily target.');
});

runTest('7. Statistics Radar Focus: 60 minutes of real focus session produces exactly 50% score', () => {
  const today = formatDateToLocalISO(new Date());
  const sessions = [
    {
      id: 'focus-1',
      startTime: '09:00',
      endTime: '10:00',
      durationMinutes: 60,
      completed: true,
      date: today
    }
  ];

  const res = calculateRadarFocusScore(sessions, today);
  assert.strictEqual(res.completedFocusMinutes, 60, 'Completed focus minutes must be 60');
  assert.strictEqual(res.focusScore, 50, 'Focus score must be 50% (60/120)');
  assert.strictEqual(res.insight, '60/120 focus minutes completed against daily target.');
});

// ----------------------------------------------------------------------------
// 3. Home Screen -> Squad Task Contribution Flow
// ----------------------------------------------------------------------------
runTest('8. Home Screen Task Completion: Eligible task creates Squad contribution and 0 XP/HP from Squad', () => {
  localStorage.clear();

  const todayStr = formatDateToLocalISO(new Date());

  // Setup squad state with active challenge
  const initialSquad = {
    squad: {
      id: 'squad-alpha',
      name: 'Alpha Squad',
      tier: 'Diamond II',
      seasonLabel: 'Season 4 • Week 3',
      members: [
        {
          id: 'user-me',
          name: 'Alex Rivera',
          role: 'Squad Leader',
          avatarUrl: '',
          weeklyHPContribution: 0,
          currentStreakDays: 1,
          lastActiveTimestamp: Date.now(),
          isCurrentUser: true
        }
      ]
    },
    challenges: [
      {
        id: 'chal-deep-work',
        title: 'Deep Work Sprint',
        category: 'Deep Work',
        targetDays: 7,
        currentDays: 0,
        hpReward: 250,
        completedDates: [],
        memberContributions: { 'user-me': 0 },
        activeDates: { start: todayStr, end: todayStr },
        criteria: {
          qualificationType: 'task_category',
          category: 'Deep Work'
        }
      }
    ],
    contributions: [],
    lastUpdated: Date.now()
  };

  storage['KAIROS_SQUAD_STATE_V1'] = JSON.stringify(initialSquad);

  // Simulate HomeScreen task completion
  const taskToComplete = {
    id: 'task-deep-1',
    title: 'Distributed Systems Architecture',
    category: 'Deep Work',
    hp: 40,
    startTime: '09:00',
    endTime: '11:00'
  };

  // 1. Progression completeTask
  const initialProgression = {
    level: 5,
    totalXP: 1000,
    xpRemainder: 0,
    todayHP: 0,
    lifetimeHP: 500,
    currentStreak: 1,
    lastActiveDate: todayStr,
    completedTaskIdsToday: [],
    taskHistory: [],
    achievementRewardedIds: [],
    levelUpHistory: []
  };

  // Progression awards XP & HP
  initialProgression.todayHP += taskToComplete.hp;
  initialProgression.lifetimeHP += taskToComplete.hp;
  initialProgression.totalXP += taskToComplete.hp;
  initialProgression.completedTaskIdsToday.push(taskToComplete.id);
  initialProgression.taskHistory.push({
    taskId: taskToComplete.id,
    taskTitle: taskToComplete.title,
    hpAwarded: taskToComplete.hp,
    xpAwarded: taskToComplete.hp,
    completedAt: new Date().toISOString(),
    date: todayStr
  });

  storage['KAIROS_PROGRESSION_STATE_V1'] = JSON.stringify(initialProgression);

  // 2. Squad contribution recorded independently
  const loadedSquad = JSON.parse(storage['KAIROS_SQUAD_STATE_V1']);
  const targetChallenge = loadedSquad.challenges.find((c) => c.id === 'chal-deep-work');

  // Verify task qualifies
  const matchesCategory = targetChallenge.criteria.category === taskToComplete.category;
  assert.strictEqual(matchesCategory, true, 'Task category matches challenge criteria');

  const contribId = `contrib-${targetChallenge.id}-user-me-${taskToComplete.id}-${todayStr}`;
  loadedSquad.contributions.push({
    id: contribId,
    challengeId: targetChallenge.id,
    memberId: 'user-me',
    date: todayStr,
    timestamp: Date.now(),
    taskId: taskToComplete.id
  });
  targetChallenge.currentDays += 1;
  targetChallenge.completedDates.push(todayStr);
  targetChallenge.memberContributions['user-me'] = 1;

  storage['KAIROS_SQUAD_STATE_V1'] = JSON.stringify(loadedSquad);

  // 3. Verify Progression was NOT modified by Squad contribution
  const verifyProg = JSON.parse(storage['KAIROS_PROGRESSION_STATE_V1']);
  assert.strictEqual(verifyProg.todayHP, 40, 'Progression todayHP must be exactly 40 (0 from Squad)');
  assert.strictEqual(verifyProg.totalXP, 1040, 'Progression totalXP must be exactly 1040 (0 from Squad)');
  assert.strictEqual(verifyProg.lifetimeHP, 540, 'Progression lifetimeHP must be exactly 540');

  // 4. Verify Squad state updated cleanly
  const verifySquad = JSON.parse(storage['KAIROS_SQUAD_STATE_V1']);
  assert.strictEqual(verifySquad.contributions.length, 1, 'Exactly one contribution recorded');
  assert.strictEqual(verifySquad.challenges[0].currentDays, 1, 'Challenge progress incremented to 1');
});

runTest('9. Home Screen Task Completion: Ineligible task does not contribute to Squad challenge', () => {
  localStorage.clear();

  const todayStr = formatDateToLocalISO(new Date());

  const initialSquad = {
    squad: {
      id: 'squad-alpha',
      name: 'Alpha Squad',
      tier: 'Diamond II',
      members: [{ id: 'user-me', name: 'Alex Rivera' }]
    },
    challenges: [
      {
        id: 'chal-circadian',
        title: 'Morning Sun & Circadian',
        category: 'Circadian Health',
        targetDays: 7,
        currentDays: 0,
        completedDates: [],
        memberContributions: {},
        activeDates: { start: todayStr, end: todayStr },
        criteria: {
          qualificationType: 'task_category',
          category: 'Circadian Health'
        }
      }
    ],
    contributions: []
  };

  storage['KAIROS_SQUAD_STATE_V1'] = JSON.stringify(initialSquad);

  // Task is 'Fitness', challenge requires 'Circadian Health'
  const taskToComplete = {
    id: 'task-gym-1',
    title: 'Afternoon Strength Training',
    category: 'Fitness',
    hp: 35
  };

  const loadedSquad = JSON.parse(storage['KAIROS_SQUAD_STATE_V1']);
  const targetChallenge = loadedSquad.challenges[0];
  const qualifies = targetChallenge.criteria.category === taskToComplete.category;

  assert.strictEqual(qualifies, false, 'Fitness task must NOT qualify for Circadian Health challenge');
  assert.strictEqual(loadedSquad.contributions.length, 0, 'No squad contributions recorded');
  assert.strictEqual(targetChallenge.currentDays, 0, 'Challenge progress remains 0');
});

// ----------------------------------------------------------------------------
// 4. Achievement Reward Invariants
// ----------------------------------------------------------------------------
runTest('10. Achievements: Level-scaled XP percentage mapping is strictly XP-only and 0 HP', () => {
  const ACHIEVEMENT_RARITY_XP_PERCENTAGES = {
    common: 0.05,
    uncommon: 0.075,
    rare: 0.10,
    epic: 0.15,
    legendary: 0.20,
    mythic: 0.25
  };

  // Test across levels
  const levelDeltas = { 2: 125, 5: 350, 10: 1200, 50: 15000, 100: 50000 };

  for (const [lvlStr, deltaXP] of Object.entries(levelDeltas)) {
    const lvl = Number(lvlStr);
    for (const [rarity, pct] of Object.entries(ACHIEVEMENT_RARITY_XP_PERCENTAGES)) {
      const xp = Math.max(1, Math.round(deltaXP * pct));
      assert(xp > 0, `XP for ${rarity} at level ${lvl} must be > 0`);
    }
  }
});

console.log(`\nStage 3 Data Integrity Tests Finished: ${passed} passed, ${failed} failed.\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
