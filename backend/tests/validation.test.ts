import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  UUIDSchema,
  DateStringSchema,
  CreateUserSchema,
  CreateTaskSchema,
  CompleteTaskSchema,
  ClaimAchievementSchema,
  CreateSquadSchema
} from '../src/validators/schemas.js';

describe('Kairos Domain Validation & Boundary Rejections (Phase E.2)', () => {
  test('1. UUIDSchema accepts valid UUIDs and rejects malformed strings', () => {
    const validUUID = 'a3b8c2d1-4e5f-6a7b-8c9d-0e1f2a3b4c5d';
    assert.equal(UUIDSchema.parse(validUUID), validUUID);

    assert.throws(() => UUIDSchema.parse('invalid-uuid'), /Invalid UUID/);
    assert.throws(() => UUIDSchema.parse(''), /Invalid UUID/);
    assert.throws(() => UUIDSchema.parse(123), /Expected string/);
  });

  test('2. DateStringSchema accepts YYYY-MM-DD and rejects invalid formats', () => {
    assert.equal(DateStringSchema.parse('2026-09-23'), '2026-09-23');

    assert.throws(() => DateStringSchema.parse('2026/09/23'), /Date must be in YYYY-MM-DD format/);
    assert.throws(() => DateStringSchema.parse('23-09-2026'), /Date must be in YYYY-MM-DD format/);
    assert.throws(() => DateStringSchema.parse('yesterday'), /Date must be in YYYY-MM-DD format/);
  });

  test('3. CreateUserSchema enforces valid email and minimum password length', () => {
    const valid = CreateUserSchema.parse({
      email: 'alex@kairos.ai',
      password: 'strong-passcode-123'
    });
    assert.equal(valid.email, 'alex@kairos.ai');

    assert.throws(() => CreateUserSchema.parse({ email: 'not-an-email', password: '123' }));
    assert.throws(() => CreateUserSchema.parse({ email: 'alex@kairos.ai', password: 'short' }), /at least 8 characters/);
  });

  test('4. CompleteTaskSchema rejects impossible task HP values', () => {
    const valid = CompleteTaskSchema.parse({
      taskId: 'sys-hydration-am',
      completionDate: '2026-09-23',
      taskHp: 15,
      idempotencyKey: 'idem-op-12345678'
    });
    assert.equal(valid.taskHp, 15);

    // Rejects negative HP
    assert.throws(() => CompleteTaskSchema.parse({
      taskId: 'sys-hydration-am',
      completionDate: '2026-09-23',
      taskHp: -5,
      idempotencyKey: 'idem-op-12345678'
    }));

    // Rejects zero HP
    assert.throws(() => CompleteTaskSchema.parse({
      taskId: 'sys-hydration-am',
      completionDate: '2026-09-23',
      taskHp: 0,
      idempotencyKey: 'idem-op-12345678'
    }));

    // Rejects oversized HP (>400)
    assert.throws(() => CompleteTaskSchema.parse({
      taskId: 'sys-hydration-am',
      completionDate: '2026-09-23',
      taskHp: 9999,
      idempotencyKey: 'idem-op-12345678'
    }));
  });

  test('5. ClaimAchievementSchema validates rarity enum', () => {
    const valid = ClaimAchievementSchema.parse({
      achievementId: 'ach-first-step',
      rarity: 'epic',
      idempotencyKey: 'idem-claim-12345678'
    });
    assert.equal(valid.rarity, 'epic');

    assert.throws(() => ClaimAchievementSchema.parse({
      achievementId: 'ach-first-step',
      rarity: 'ultra-super-rare',
      idempotencyKey: 'idem-claim-12345678'
    }));
  });

  test('6. CreateSquadSchema enforces handle constraints', () => {
    const valid = CreateSquadSchema.parse({
      name: 'Alpha Vanguard',
      handle: 'alpha_vanguard'
    });
    assert.equal(valid.handle, 'alpha_vanguard');

    assert.throws(() => CreateSquadSchema.parse({
      name: 'Alpha Vanguard',
      handle: 'Invalid Handle With Spaces!'
    }));
  });
});
