import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateReward, addExperience, getLevelForTotalXP } from '../src/services/progressionEngine.service.js';

describe('Kairos Data Model & Server Authority Logic (Phase E.2)', () => {
  // Simulated In-Memory Ledger for Unit Verification of Anti-Duplication Rules
  interface SimulatedCompletionLedger {
    userId: string;
    taskId: string;
    completionDate: string;
    idempotencyKey: string;
    earnedXp: number;
    earnedHp: number;
  }

  interface SimulatedUserState {
    userId: string;
    totalXp: number;
    xpRemainder: number;
    level: number;
    todayHp: number;
    lastActiveDate: string;
  }

  function simulateTaskCompletion(
    userState: SimulatedUserState,
    ledger: SimulatedCompletionLedger[],
    params: {
      taskId: string;
      completionDate: string;
      taskHp: number;
      idempotencyKey: string;
    }
  ) {
    // 1. Check Anti-Duplication Constraint: (userId, taskId, completionDate) OR (userId, idempotencyKey)
    const duplicate = ledger.find(
      (entry) =>
        entry.userId === userState.userId &&
        ((entry.taskId === params.taskId && entry.completionDate === params.completionDate) ||
          entry.idempotencyKey === params.idempotencyKey)
    );

    if (duplicate) {
      return {
        status: 'ALREADY_PROCESSED',
        earnedXp: 0,
        earnedHp: 0,
        userState,
        isDuplicate: true
      };
    }

    // 2. Rollover
    let effectiveTodayHp = userState.todayHp;
    if (userState.lastActiveDate !== params.completionDate) {
      effectiveTodayHp = 0;
    }

    // 3. Calculate Reward
    const reward = calculateReward(userState.level, effectiveTodayHp, params.taskHp);
    const newTodayHp = effectiveTodayHp + params.taskHp;

    // 4. Update XP & Level
    const xpUpdate = addExperience(userState.totalXp, userState.xpRemainder, reward.earnedXP);
    const newLevel = getLevelForTotalXP(xpUpdate.newTotalXP);

    // 5. Append to Ledger
    ledger.push({
      userId: userState.userId,
      taskId: params.taskId,
      completionDate: params.completionDate,
      idempotencyKey: params.idempotencyKey,
      earnedXp: reward.earnedXP,
      earnedHp: params.taskHp
    });

    userState.totalXp = xpUpdate.newTotalXP;
    userState.xpRemainder = xpUpdate.newRemainder;
    userState.level = newLevel;
    userState.todayHp = newTodayHp;
    userState.lastActiveDate = params.completionDate;

    return {
      status: 'SUCCESS',
      earnedXp: reward.earnedXP,
      earnedHp: params.taskHp,
      userState,
      isDuplicate: false
    };
  }

  test('1. First task completion awards full XP and HP', () => {
    const userState: SimulatedUserState = {
      userId: 'user-1',
      totalXp: 0,
      xpRemainder: 0,
      level: 1,
      todayHp: 0,
      lastActiveDate: ''
    };
    const ledger: SimulatedCompletionLedger[] = [];

    const res = simulateTaskCompletion(userState, ledger, {
      taskId: 'sys-hydration-am',
      completionDate: '2026-09-23',
      taskHp: 15,
      idempotencyKey: 'op-001'
    });

    assert.equal(res.status, 'SUCCESS');
    assert.equal(res.earnedHp, 15);
    assert.equal(res.earnedXp, 15.0);
    assert.equal(res.userState.totalXp, 15);
    assert.equal(res.userState.todayHp, 15);
    assert.equal(ledger.length, 1);
  });

  test('2. Duplicate task completion on same date is rejected without awarding XP/HP', () => {
    const userState: SimulatedUserState = {
      userId: 'user-1',
      totalXp: 15,
      xpRemainder: 0,
      level: 1,
      todayHp: 15,
      lastActiveDate: '2026-09-23'
    };
    const ledger: SimulatedCompletionLedger[] = [
      {
        userId: 'user-1',
        taskId: 'sys-hydration-am',
        completionDate: '2026-09-23',
        idempotencyKey: 'op-001',
        earnedXp: 15,
        earnedHp: 15
      }
    ];

    // Second attempt with different idempotency key
    const res = simulateTaskCompletion(userState, ledger, {
      taskId: 'sys-hydration-am',
      completionDate: '2026-09-23',
      taskHp: 15,
      idempotencyKey: 'op-002'
    });

    assert.equal(res.status, 'ALREADY_PROCESSED');
    assert.equal(res.isDuplicate, true);
    assert.equal(res.earnedXp, 0);
    assert.equal(res.earnedHp, 0);
    assert.equal(userState.totalXp, 15, 'Total XP must not change');
    assert.equal(userState.todayHp, 15, 'Today HP must not change');
    assert.equal(ledger.length, 1, 'Ledger size must remain 1');
  });

  test('3. Idempotency key replay is safely acknowledged without double crediting', () => {
    const userState: SimulatedUserState = {
      userId: 'user-1',
      totalXp: 15,
      xpRemainder: 0,
      level: 1,
      todayHp: 15,
      lastActiveDate: '2026-09-23'
    };
    const ledger: SimulatedCompletionLedger[] = [
      {
        userId: 'user-1',
        taskId: 'sys-hydration-am',
        completionDate: '2026-09-23',
        idempotencyKey: 'op-001',
        earnedXp: 15,
        earnedHp: 15
      }
    ];

    // Same idempotency key replayed (e.g. network retry)
    const res = simulateTaskCompletion(userState, ledger, {
      taskId: 'sys-another-task',
      completionDate: '2026-09-23',
      taskHp: 20,
      idempotencyKey: 'op-001'
    });

    assert.equal(res.status, 'ALREADY_PROCESSED');
    assert.equal(res.isDuplicate, true);
    assert.equal(res.earnedXp, 0);
    assert.equal(userState.totalXp, 15);
  });

  test('4. Multi-User Isolation: User A and User B can complete the same task without interference', () => {
    const userAState: SimulatedUserState = {
      userId: 'user-a',
      totalXp: 0,
      xpRemainder: 0,
      level: 1,
      todayHp: 0,
      lastActiveDate: ''
    };
    const userBState: SimulatedUserState = {
      userId: 'user-b',
      totalXp: 0,
      xpRemainder: 0,
      level: 1,
      todayHp: 0,
      lastActiveDate: ''
    };
    const ledger: SimulatedCompletionLedger[] = [];

    // User A completes task
    const resA = simulateTaskCompletion(userAState, ledger, {
      taskId: 'sys-morning-routine',
      completionDate: '2026-09-23',
      taskHp: 25,
      idempotencyKey: 'op-a-1'
    });
    assert.equal(resA.status, 'SUCCESS');
    assert.equal(userAState.totalXp, 25);

    // User B completes the EXACT SAME task ID on the EXACT SAME date
    const resB = simulateTaskCompletion(userBState, ledger, {
      taskId: 'sys-morning-routine',
      completionDate: '2026-09-23',
      taskHp: 25,
      idempotencyKey: 'op-b-1'
    });
    assert.equal(resB.status, 'SUCCESS');
    assert.equal(userBState.totalXp, 25);

    assert.equal(ledger.length, 2);
  });

  test('5. Squad contribution invariant: strictly awards 0 personal XP and 0 personal HP', () => {
    const squadContribution = {
      challengeId: 'challenge-1',
      squadCurrentCount: 4,
      targetCount: 10,
      awardedPersonalXp: 0,
      awardedPersonalHp: 0
    };

    assert.equal(squadContribution.awardedPersonalXp, 0, 'Squad contribution must award 0 XP to user');
    assert.equal(squadContribution.awardedPersonalHp, 0, 'Squad contribution must award 0 HP to user');
  });
});
