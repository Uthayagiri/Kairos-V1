import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDeltaXP,
  calculateDailyHpThreshold,
  getLevelForTotalXP,
  getLevelTitle,
  calculateReward,
  addExperience,
  calculateAchievementXpReward,
  calculateCurrentStreak,
  CUMULATIVE_XP_TABLE,
  LEVEL_DELTAS,
  PROGRESSION_CONFIG
} from '../src/services/progressionEngine.service.js';

describe('Kairos Server Progression Engine & Mathematical Invariants (Phase E.2)', () => {
  test('1. Level 1 starts at 0 XP and has threshold of 100 HP', () => {
    assert.equal(getLevelForTotalXP(0), 1);
    assert.equal(calculateDailyHpThreshold(1), 100);
    assert.equal(getLevelTitle(1), 'Initiate Flow');
  });

  test('2. Level thresholds increase by +15 HP every 5 levels', () => {
    assert.equal(calculateDailyHpThreshold(1), 100); // Levels 1-4
    assert.equal(calculateDailyHpThreshold(4), 100);
    assert.equal(calculateDailyHpThreshold(5), 115); // Level 5
    assert.equal(calculateDailyHpThreshold(9), 115);
    assert.equal(calculateDailyHpThreshold(10), 130); // Level 10
    assert.equal(calculateDailyHpThreshold(50), 250); // Level 50
    assert.equal(calculateDailyHpThreshold(100), 400); // Level 100
  });

  test('3. 100-Level Cumulative XP Table reaches exact target at Level 100', () => {
    assert.equal(CUMULATIVE_XP_TABLE.length, 101);
    assert.equal(CUMULATIVE_XP_TABLE[1], 0);
    assert.equal(CUMULATIVE_XP_TABLE[2], 125);
    assert.equal(CUMULATIVE_XP_TABLE[100], 867415);
    assert.equal(getLevelForTotalXP(867415), 100);
    assert.equal(getLevelForTotalXP(1000000), 100, 'Max level is capped at 100');
    assert.equal(getLevelTitle(100), 'Aion Prime: The Kairos Omniscient');
  });

  test('4. Task pre-cap HP converts at 1.0x rate', () => {
    // Level 1: threshold is 100 HP. Current todayHP = 0, Task = 50 HP.
    const reward = calculateReward(1, 0, 50);
    assert.equal(reward.preCapHP, 50);
    assert.equal(reward.postCapHP, 0);
    assert.equal(reward.earnedXP, 50.0);
  });

  test('5. Task post-cap HP converts at 0.01x rate (100 HP = 1 XP)', () => {
    // Level 1: threshold is 100 HP. Current todayHP = 100 (cap reached), Task = 100 HP.
    const reward = calculateReward(1, 100, 100);
    assert.equal(reward.preCapHP, 0);
    assert.equal(reward.postCapHP, 100);
    assert.equal(reward.earnedXP, 1.0);
  });

  test('6. Task crossing the threshold splits into pre-cap (1.0x) and post-cap (0.01x)', () => {
    // Level 1: threshold is 100 HP. Current todayHP = 80, Task = 50 HP.
    // Pre-cap: 20 HP -> 20.0 XP. Post-cap: 30 HP -> 0.30 XP. Total = 20.3 XP.
    const reward = calculateReward(1, 80, 50);
    assert.equal(reward.preCapHP, 20);
    assert.equal(reward.postCapHP, 30);
    assert.equal(reward.earnedXP, 20.3);
  });

  test('7. Fractional XP remainder is preserved in [0.0, 1.0) without truncation', () => {
    let totalXP = 100;
    let remainder = 0.8;
    const gained = addExperience(totalXP, remainder, 0.3); // 0.8 + 0.3 = 1.1 -> +1 whole XP, 0.1 remainder

    assert.equal(gained.wholeGained, 1);
    assert.equal(gained.newTotalXP, 101);
    assert.equal(gained.newRemainder, 0.1);
  });

  test('8. Achievement rewards grant level-scaled XP only with strictly 0 HP', () => {
    // Level 1 -> next level is Level 2 (deltaXP = 125). Common = 5% = 6 XP.
    const rewardLvl1 = calculateAchievementXpReward('common', 1);
    assert.equal(rewardLvl1, 6);

    const rewardMythicLvl1 = calculateAchievementXpReward('mythic', 1); // 25% of 125 = 31 XP
    assert.equal(rewardMythicLvl1, 31);

    // Test at Level 100 (capped at Level 100 delta)
    const rewardMythicLvl100 = calculateAchievementXpReward('mythic', 100);
    assert.ok(rewardMythicLvl100 > 1000);
  });

  test('9. Streak calculation correctly evaluates consecutive calendar dates', () => {
    const history = [
      { completionDate: '2026-09-23' },
      { completionDate: '2026-09-22' },
      { completionDate: '2026-09-21' }
    ];
    const streak = calculateCurrentStreak(history, '2026-09-23');
    assert.equal(streak, 3);
  });

  test('10. Streak maintains unbroken count if yesterday was active and today is pending', () => {
    const history = [
      { completionDate: '2026-09-22' },
      { completionDate: '2026-09-21' }
    ];
    const streak = calculateCurrentStreak(history, '2026-09-23');
    assert.equal(streak, 2, 'Should preserve yesterday streak');
  });

  test('11. Streak breaks if there is a skipped day', () => {
    const history = [
      { completionDate: '2026-09-20' }, // skipped 21 and 22
      { completionDate: '2026-09-19' }
    ];
    const streak = calculateCurrentStreak(history, '2026-09-23');
    assert.equal(streak, 0, 'Streak should be 0 when broken');
  });
});
