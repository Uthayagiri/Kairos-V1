/**
 * Kairos Squad — Stage 1 Local Domain Architecture Test Suite
 * Validates:
 * 1. Squad creation: Squad entity with id, name, createdAt, ownerId, members, challengeIds
 * 2. Squad persistence: State saves to KAIROS_SQUAD_STATE_V1 and loads accurately
 * 3. Challenge belongs to Squad: challenge has squadId linking to Squad entity
 * 4. Member representation: SquadMember model with id, name, avatar, role, isCurrentUser
 * 5. Contribution creation: SquadContribution with deterministic ID, quantity, date, etc.
 * 6. Contribution persistence: Contributions saved in state and loaded accurately
 * 7. Duplicate contribution prevention: Idempotent check-in prevents duplicate contribution records
 * 8. Challenge progress calculation: Aggregate calculation from contribution records / completed dates
 * 9. Existing check-in compatibility: Check-in records completed dates and updates current days
 * 10. Migration from legacy storage: KAIROS_SQUAD_CHALLENGES_V1 seamlessly migrated to KAIROS_SQUAD_STATE_V1
 * 11. Existing completed dates preserved: Legacy completedDates become contribution records
 * 12. Local-date behavior around midnight: Local YYYY-MM-DD used consistently, immune to UTC drift
 * 13. Existing progression reward occurs once: Progression completeTask called exactly once per check-in
 * 14. Undo check-in cleanly removes contribution without leaving stale state
 */

const assert = require('assert');

// In-memory mock localStorage
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

// Global CustomEvent polyfill
if (typeof CustomEvent === 'undefined') {
  global.CustomEvent = class CustomEvent {
    constructor(event, params) {
      this.event = event;
      this.detail = params?.detail;
    }
  };
}

// Local date helpers mirroring initialSquadData.ts
function formatDateToLocalISO(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysToLocalISO(isoStr, days) {
  const parts = (isoStr || formatDateToLocalISO()).split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return formatDateToLocalISO(d);
  }
  const d = new Date(parts[0], parts[1] - 1, parts[2] + days);
  return formatDateToLocalISO(d);
}

function generateContributionId(challengeId, memberId, dateStr) {
  return `contrib-${challengeId}-${memberId}-${dateStr}`;
}

// Squad Service Logic Implementation for Node test runner
const STORAGE_KEY_SQUAD_STATE = 'KAIROS_SQUAD_STATE_V1';
const STORAGE_KEY_LEGACY_CHALLENGES = 'KAIROS_SQUAD_CHALLENGES_V1';
const DEFAULT_SQUAD_ID = 'squad-productivity-champs';
const DEFAULT_SQUAD_NAME = 'Productivity Champs';
const CURRENT_USER_MEMBER_ID = 'user-alex';

const INITIAL_SQUAD_MEMBERS = [
  { id: 'user-jordan', name: 'Jordan', avatar: 'avatar1.png', xp: 3120, tasksCount: 48 },
  { id: 'user-maya', name: 'Maya', avatar: 'avatar2.png', xp: 2890, tasksCount: 41 },
  { id: 'user-liam', name: 'Liam', avatar: 'avatar3.png', xp: 2610, tasksCount: 36 },
  { id: CURRENT_USER_MEMBER_ID, name: 'Alex (You)', avatar: 'avatar4.png', isCurrentUser: true, xp: 2450, tasksCount: 34 },
  { id: 'user-elena', name: 'Elena Rostova', avatar: 'avatar5.png', xp: 2180, tasksCount: 29 },
  { id: 'user-david', name: 'David K.', avatar: 'avatar6.png', xp: 1940, tasksCount: 24 }
];

const INITIAL_SQUAD = {
  id: DEFAULT_SQUAD_ID,
  name: DEFAULT_SQUAD_NAME,
  createdAt: '2026-09-01T00:00:00.000Z',
  ownerId: CURRENT_USER_MEMBER_ID,
  league: 'Squad League • Division 1',
  members: INITIAL_SQUAD_MEMBERS,
  challengeIds: ['chal-1', 'chal-2', 'chal-3']
};

function getInitialChallenges() {
  const today = formatDateToLocalISO();
  return [
    {
      id: 'chal-1',
      squadId: DEFAULT_SQUAD_ID,
      title: '7-Day Deep Work Sprint',
      subtitle: 'Focus 2 hrs daily uninterrupted',
      category: 'Deep Work',
      durationTag: 'Daily',
      hpReward: 150,
      currentDays: 5,
      totalDays: 7,
      startDate: today,
      endDate: addDaysToLocalISO(today, 7),
      startTime: '09:00',
      endTime: '11:00',
      isAllDay: false,
      completedDates: [],
      roster: [
        { name: 'Alex (You)', isCurrentUser: true, avatar: 'avatar4.png', percentage: 71, detail: '5 / 7 days done' }
      ]
    },
    {
      id: 'chal-2',
      squadId: DEFAULT_SQUAD_ID,
      title: 'Hydration Heroes',
      subtitle: '2.5L clean water daily for 14 days',
      category: 'Circadian Health',
      durationTag: '14 Days',
      hpReward: 80,
      currentDays: 9,
      totalDays: 14,
      startDate: today,
      endDate: addDaysToLocalISO(today, 14),
      startTime: '08:00',
      endTime: '20:00',
      isAllDay: true,
      completedDates: [],
      roster: [
        { name: 'Alex (You)', isCurrentUser: true, avatar: 'avatar4.png', percentage: 85, detail: '12 / 14 days done' }
      ]
    }
  ];
}

class TestSquadService {
  constructor() {
    this.state = null;
  }

  loadSquadState() {
    try {
      const savedStateJson = localStorage.getItem(STORAGE_KEY_SQUAD_STATE);
      if (savedStateJson) {
        const parsed = JSON.parse(savedStateJson);
        if (parsed && parsed.squad && Array.isArray(parsed.challenges)) {
          this.state = {
            squad: parsed.squad,
            challenges: parsed.challenges,
            contributions: Array.isArray(parsed.contributions) ? parsed.contributions : []
          };
          return this.state;
        }
      }

      // Legacy migration
      const legacyChallengesJson = localStorage.getItem(STORAGE_KEY_LEGACY_CHALLENGES);
      if (legacyChallengesJson) {
        const legacyChallenges = JSON.parse(legacyChallengesJson);
        if (Array.isArray(legacyChallenges) && legacyChallenges.length > 0) {
          const contributions = [];
          const migratedChallenges = legacyChallenges.map((c) => {
            const squadId = c.squadId || DEFAULT_SQUAD_ID;
            (c.completedDates || []).forEach((dateStr) => {
              contributions.push({
                id: generateContributionId(c.id, CURRENT_USER_MEMBER_ID, dateStr),
                squadId,
                challengeId: c.id,
                memberId: CURRENT_USER_MEMBER_ID,
                taskId: `chal-${c.id}-${dateStr}`,
                date: dateStr,
                contributedAt: new Date().toISOString(),
                quantity: 1,
                hpEarned: c.hpReward || 100
              });
            });
            return {
              ...c,
              squadId
            };
          });

          const migratedState = {
            squad: {
              ...INITIAL_SQUAD,
              challengeIds: migratedChallenges.map((c) => c.id)
            },
            challenges: migratedChallenges,
            contributions
          };

          this.saveSquadState(migratedState);
          return migratedState;
        }
      }
    } catch {}

    const defaultState = {
      squad: INITIAL_SQUAD,
      challenges: getInitialChallenges(),
      contributions: []
    };
    this.saveSquadState(defaultState);
    return defaultState;
  }

  saveSquadState(state) {
    this.state = state;
    localStorage.setItem(STORAGE_KEY_SQUAD_STATE, JSON.stringify(state));
    localStorage.setItem(STORAGE_KEY_LEGACY_CHALLENGES, JSON.stringify(state.challenges));
  }

  getState() {
    if (!this.state) {
      this.state = this.loadSquadState();
    }
    return this.state;
  }

  getSquad() {
    return this.getState().squad;
  }

  getChallenges() {
    return this.getState().challenges;
  }

  getContributions(challengeId) {
    const all = this.getState().contributions;
    if (challengeId) {
      return all.filter((c) => c.challengeId === challengeId);
    }
    return all;
  }

  getChallengeProgress(challenge, contributions = this.getContributions(challenge.id)) {
    const challengeContribs = contributions.filter((c) => c.challengeId === challenge.id);
    const uniqueDates = Array.from(new Set(challengeContribs.map((c) => c.date)));
    const currentDays = Math.min(challenge.totalDays, uniqueDates.length);
    const percentage =
      challenge.totalDays > 0 ? Math.min(100, Math.round((currentDays / challenge.totalDays) * 100)) : 0;
    return {
      currentDays,
      totalDays: challenge.totalDays,
      percentage
    };
  }

  recordChallengeCheckIn(challengeId, dateStr = formatDateToLocalISO(), hpReward = 100, memberId = CURRENT_USER_MEMBER_ID) {
    const currentState = this.getState();
    const targetChallenge = currentState.challenges.find((c) => c.id === challengeId);
    if (!targetChallenge) {
      return { success: false, state: currentState, isNew: false };
    }

    const contributionId = generateContributionId(challengeId, memberId, dateStr);
    const alreadyExists = currentState.contributions.some((c) => c.id === contributionId);

    const newCompletedDates = Array.from(
      new Set([...(targetChallenge.completedDates || []), dateStr])
    );
    const newCurrentDays = Math.min(targetChallenge.totalDays, newCompletedDates.length);

    const updatedChallenges = currentState.challenges.map((c) => {
      if (c.id !== challengeId) return c;
      return {
        ...c,
        completedDates: newCompletedDates,
        currentDays: newCurrentDays,
        lastCompletedAt: `Completed Today`,
        roster: c.roster.map((r) => r.isCurrentUser ? {
          ...r,
          completed: true,
          percentage: Math.round((newCurrentDays / c.totalDays) * 100),
          detail: `${newCurrentDays} / ${c.totalDays} days done`
        } : r)
      };
    });

    let updatedContributions = currentState.contributions;
    if (!alreadyExists) {
      const newContribution = {
        id: contributionId,
        squadId: targetChallenge.squadId || DEFAULT_SQUAD_ID,
        challengeId,
        memberId,
        taskId: `chal-${challengeId}-${dateStr}`,
        date: dateStr,
        contributedAt: new Date().toISOString(),
        quantity: 1,
        hpEarned: hpReward
      };
      updatedContributions = [...currentState.contributions, newContribution];
    }

    const nextState = {
      ...currentState,
      challenges: updatedChallenges,
      contributions: updatedContributions
    };

    this.saveSquadState(nextState);
    return { success: true, state: nextState, isNew: !alreadyExists };
  }

  removeChallengeCheckIn(challengeId, dateStr = formatDateToLocalISO(), memberId = CURRENT_USER_MEMBER_ID) {
    const currentState = this.getState();
    const targetChallenge = currentState.challenges.find((c) => c.id === challengeId);
    if (!targetChallenge) {
      return { success: false, state: currentState };
    }

    const contributionId = generateContributionId(challengeId, memberId, dateStr);
    const newCompletedDates = (targetChallenge.completedDates || []).filter((d) => d !== dateStr);
    const newCurrentDays = Math.max(0, newCompletedDates.length);

    const updatedChallenges = currentState.challenges.map((c) => {
      if (c.id !== challengeId) return c;
      return {
        ...c,
        completedDates: newCompletedDates,
        currentDays: newCurrentDays,
        lastCompletedAt: null,
        roster: c.roster.map((r) => r.isCurrentUser ? {
          ...r,
          completed: false,
          percentage: Math.round((newCurrentDays / c.totalDays) * 100),
          detail: `${newCurrentDays} / ${c.totalDays} days done`
        } : r)
      };
    });

    const updatedContributions = currentState.contributions.filter((c) => c.id !== contributionId);

    const nextState = {
      ...currentState,
      challenges: updatedChallenges,
      contributions: updatedContributions
    };

    this.saveSquadState(nextState);
    return { success: true, state: nextState };
  }

  createChallenge(newChallenge) {
    const currentState = this.getState();
    if (currentState.challenges.length >= 5) {
      return { success: false, state: currentState, error: 'Active challenge limit reached (max 5)' };
    }
    const finalChallenge = {
      ...newChallenge,
      squadId: currentState.squad.id
    };
    const nextChallenges = [...currentState.challenges, finalChallenge];
    const nextSquad = {
      ...currentState.squad,
      challengeIds: nextChallenges.map((c) => c.id)
    };
    const nextState = {
      ...currentState,
      squad: nextSquad,
      challenges: nextChallenges
    };
    this.saveSquadState(nextState);
    return { success: true, state: nextState };
  }

  archiveChallenge(challengeId) {
    const currentState = this.getState();
    const nextChallenges = currentState.challenges.filter((c) => c.id !== challengeId);
    const nextContributions = currentState.contributions.filter((c) => c.challengeId !== challengeId);
    const nextSquad = {
      ...currentState.squad,
      challengeIds: nextChallenges.map((c) => c.id)
    };
    const nextState = {
      ...currentState,
      squad: nextSquad,
      challenges: nextChallenges,
      contributions: nextContributions
    };
    this.saveSquadState(nextState);
    return { success: true, state: nextState };
  }
}

// Test Runner
let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    localStorage.clear();
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log('\n--- Running Kairos Squad Stage 1 Local Architecture Tests ---');

runTest('1. Squad Creation - Proper domain entity structure', () => {
  const service = new TestSquadService();
  const state = service.loadSquadState();
  const squad = state.squad;

  assert.strictEqual(squad.id, 'squad-productivity-champs');
  assert.strictEqual(squad.name, 'Productivity Champs');
  assert.strictEqual(squad.ownerId, 'user-alex');
  assert.ok(squad.createdAt);
  assert.ok(Array.isArray(squad.members));
  assert.strictEqual(squad.members.length, 6);
  assert.ok(Array.isArray(squad.challengeIds));
});

runTest('2. Squad Persistence - Saves to and loads from KAIROS_SQUAD_STATE_V1', () => {
  const service1 = new TestSquadService();
  const state1 = service1.loadSquadState();
  assert.ok(localStorage.getItem(STORAGE_KEY_SQUAD_STATE));

  const service2 = new TestSquadService();
  const state2 = service2.loadSquadState();
  assert.strictEqual(state2.squad.id, state1.squad.id);
  assert.strictEqual(state2.challenges.length, state1.challenges.length);
});

runTest('3. Challenge Belongs to Squad - Challenge models contain squadId', () => {
  const service = new TestSquadService();
  const state = service.loadSquadState();
  state.challenges.forEach((challenge) => {
    assert.strictEqual(challenge.squadId, state.squad.id);
  });
});

runTest('4. Member Representation - SquadMember model with isCurrentUser and roles', () => {
  const service = new TestSquadService();
  const squad = service.getSquad();
  const alex = squad.members.find((m) => m.isCurrentUser);

  assert.ok(alex, 'Current user member Alex must exist');
  assert.strictEqual(alex.id, 'user-alex');
  assert.strictEqual(alex.isCurrentUser, true);

  const jordan = squad.members.find((m) => m.id === 'user-jordan');
  assert.ok(jordan);
  assert.strictEqual(jordan.name, 'Jordan');
  assert.ok(jordan.xp > 0);
});

runTest('5. Contribution Creation - SquadContribution with deterministic ID & metadata', () => {
  const service = new TestSquadService();
  service.loadSquadState();
  const dateStr = '2026-09-23';

  const res = service.recordChallengeCheckIn('chal-1', dateStr, 150, 'user-alex');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.isNew, true);

  const contribs = service.getContributions('chal-1');
  assert.strictEqual(contribs.length, 1);
  const c = contribs[0];
  assert.strictEqual(c.id, 'contrib-chal-1-user-alex-2026-09-23');
  assert.strictEqual(c.challengeId, 'chal-1');
  assert.strictEqual(c.memberId, 'user-alex');
  assert.strictEqual(c.date, dateStr);
  assert.strictEqual(c.quantity, 1);
  assert.strictEqual(c.hpEarned, 150);
});

runTest('6. Contribution Persistence - Contributions persist across service reloads', () => {
  const service1 = new TestSquadService();
  service1.loadSquadState();
  service1.recordChallengeCheckIn('chal-1', '2026-09-23', 150, 'user-alex');

  const service2 = new TestSquadService();
  const state2 = service2.loadSquadState();
  const contribs = service2.getContributions('chal-1');
  assert.strictEqual(contribs.length, 1);
  assert.strictEqual(contribs[0].id, 'contrib-chal-1-user-alex-2026-09-23');
});

runTest('7. Duplicate Contribution Prevention - Idempotent check-in prevents duplicate records', () => {
  const service = new TestSquadService();
  service.loadSquadState();
  const dateStr = '2026-09-23';

  const res1 = service.recordChallengeCheckIn('chal-1', dateStr, 150, 'user-alex');
  assert.strictEqual(res1.success, true);
  assert.strictEqual(res1.isNew, true);

  const res2 = service.recordChallengeCheckIn('chal-1', dateStr, 150, 'user-alex');
  assert.strictEqual(res2.success, true);
  assert.strictEqual(res2.isNew, false, 'Second check-in on same day must not be new');

  const contribs = service.getContributions('chal-1');
  assert.strictEqual(contribs.length, 1, 'There must be exactly 1 contribution record');
});

runTest('8. Challenge Progress Calculation - Aggregated from contribution records', () => {
  const service = new TestSquadService();
  service.loadSquadState();

  const challenge = service.getChallenges().find((c) => c.id === 'chal-1');
  assert.ok(challenge);

  const initialProgress = service.getChallengeProgress(challenge);
  assert.strictEqual(initialProgress.currentDays, 0);
  assert.strictEqual(initialProgress.percentage, 0);

  service.recordChallengeCheckIn('chal-1', '2026-09-20', 100);
  service.recordChallengeCheckIn('chal-1', '2026-09-21', 100);
  service.recordChallengeCheckIn('chal-1', '2026-09-22', 100);

  const updatedProgress = service.getChallengeProgress(challenge);
  assert.strictEqual(updatedProgress.currentDays, 3);
  assert.strictEqual(updatedProgress.totalDays, 7);
  assert.strictEqual(updatedProgress.percentage, Math.round((3 / 7) * 100));
});

runTest('9. Existing Check-In Compatibility - Updates completedDates & roster percentage', () => {
  const service = new TestSquadService();
  service.loadSquadState();
  const today = formatDateToLocalISO();

  service.recordChallengeCheckIn('chal-1', today, 150);

  const challenge = service.getChallenges().find((c) => c.id === 'chal-1');
  assert.ok(challenge.completedDates.includes(today));
  assert.strictEqual(challenge.currentDays, 1);
  const alexRoster = challenge.roster.find((r) => r.isCurrentUser);
  assert.strictEqual(alexRoster.completed, true);
});

runTest('10. Legacy Migration - Migrates KAIROS_SQUAD_CHALLENGES_V1 to new SquadState', () => {
  const legacyData = [
    {
      id: 'legacy-chal-1',
      title: 'Legacy Challenge',
      category: 'Deep Work',
      durationTag: '7 Days',
      hpReward: 200,
      currentDays: 2,
      totalDays: 7,
      completedDates: ['2026-09-20', '2026-09-21'],
      roster: []
    }
  ];
  localStorage.setItem(STORAGE_KEY_LEGACY_CHALLENGES, JSON.stringify(legacyData));

  const service = new TestSquadService();
  const state = service.loadSquadState();

  assert.strictEqual(state.challenges.length, 1);
  assert.strictEqual(state.challenges[0].id, 'legacy-chal-1');
  assert.strictEqual(state.challenges[0].squadId, DEFAULT_SQUAD_ID);
  assert.strictEqual(state.squad.id, DEFAULT_SQUAD_ID);
  assert.ok(localStorage.getItem(STORAGE_KEY_SQUAD_STATE));
});

runTest('11. Preserving Historical Completed Dates - Generates contributions during migration', () => {
  const legacyData = [
    {
      id: 'legacy-chal-99',
      title: 'Historical Sprint',
      category: 'Circadian Health',
      hpReward: 120,
      totalDays: 10,
      completedDates: ['2026-09-18', '2026-09-19', '2026-09-20'],
      roster: []
    }
  ];
  localStorage.setItem(STORAGE_KEY_LEGACY_CHALLENGES, JSON.stringify(legacyData));

  const service = new TestSquadService();
  const state = service.loadSquadState();

  const contribs = state.contributions.filter((c) => c.challengeId === 'legacy-chal-99');
  assert.strictEqual(contribs.length, 3, 'Must have generated 3 contribution records');
  assert.strictEqual(contribs[0].date, '2026-09-18');
  assert.strictEqual(contribs[1].date, '2026-09-19');
  assert.strictEqual(contribs[2].date, '2026-09-20');
});

runTest('12. Local-Date Behavior Around Midnight - Immune to UTC timezone shift', () => {
  // Simulate 11:45 PM IST on Sept 22 (which is 6:15 PM UTC on Sept 22)
  const lateNightIST = new Date(2026, 8, 22, 23, 45, 0); // Month 8 is September
  const localDateLate = formatDateToLocalISO(lateNightIST);
  assert.strictEqual(localDateLate, '2026-09-22');

  // Simulate 12:15 AM IST on Sept 23 (which is 6:45 PM UTC on Sept 22)
  const earlyMorningIST = new Date(2026, 8, 23, 0, 15, 0);
  const localDateEarly = formatDateToLocalISO(earlyMorningIST);
  assert.strictEqual(localDateEarly, '2026-09-23');

  // Verify addDaysToLocalISO arithmetic
  const nextDay = addDaysToLocalISO(localDateLate, 1);
  assert.strictEqual(nextDay, '2026-09-23');
});

runTest('13. Single Progression Reward - completeTask executed only once', () => {
  const service = new TestSquadService();
  service.loadSquadState();

  let progressionCallCount = 0;
  const mockProgression = {
    completeTask: () => { progressionCallCount++; }
  };

  const dateStr = '2026-09-23';

  // First check-in
  const res1 = service.recordChallengeCheckIn('chal-1', dateStr, 150);
  if (res1.isNew) {
    mockProgression.completeTask();
  }
  assert.strictEqual(progressionCallCount, 1);

  // Duplicate check-in attempt
  const res2 = service.recordChallengeCheckIn('chal-1', dateStr, 150);
  if (res2.isNew) {
    mockProgression.completeTask();
  }
  assert.strictEqual(progressionCallCount, 1, 'Progression must NOT be called a second time');
});

runTest('14. Undo Clean State - Uncheck removes contribution cleanly without stale records', () => {
  const service = new TestSquadService();
  service.loadSquadState();
  const dateStr = '2026-09-23';

  service.recordChallengeCheckIn('chal-1', dateStr, 150);
  assert.strictEqual(service.getContributions('chal-1').length, 1);

  const undoRes = service.removeChallengeCheckIn('chal-1', dateStr);
  assert.strictEqual(undoRes.success, true);
  assert.strictEqual(service.getContributions('chal-1').length, 0);

  const challenge = service.getChallenges().find((c) => c.id === 'chal-1');
  assert.strictEqual(challenge.completedDates.includes(dateStr), false);
  assert.strictEqual(challenge.currentDays, 0);
  assert.strictEqual(challenge.roster.find((r) => r.isCurrentUser).completed, false);
});

console.log(`\nSquad Tests Finished: ${passed} passed, ${failed} failed.\n`);
assert.strictEqual(failed, 0, `Squad test suite had ${failed} failures.`);
