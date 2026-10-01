import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { randomUUID } from 'node:crypto';

describe('Kairos Multi-User Persistence, Profile Continuity & Isolation Test Suite', () => {
  let app: FastifyInstance;

  const runId = Date.now();
  const userAEmail = `tester.a.${runId}@kairos.ai`;
  const userBEmail = `tester.b.${runId}@kairos.ai`;
  const userAPassword = 'Password123!@#';
  const userBPassword = 'Password456!@#';
  const uniqueHandleA = `@master_${runId}`;
  const uniqueHandleB = `@cadet_${runId}`;

  let tokenA = '';
  let userIdA = '';
  let tokenB = '';
  let userIdB = '';

  before(async () => {
    process.env.NODE_ENV = 'test';
    app = await buildApp({ logger: false });
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  test('1. Registers User A and issues access token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: userAEmail, password: userAPassword }
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.ok(body.accessToken);
    assert.ok(body.user.id);
    tokenA = body.accessToken;
    userIdA = body.user.id;
  });

  test('2. User A updates profile with custom name, handle, quote and avatar', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/auth/profile',
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: {
        name: 'Minato Namikaze',
        handle: uniqueHandleA,
        quote: 'Speed and precision define the moment.',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb'
      }
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.user.profile.name, 'Minato Namikaze');
    assert.equal(body.user.profile.handle, uniqueHandleA);
    assert.equal(body.user.profile.quote, 'Speed and precision define the moment.');
  });

  test('3. User A creates and completes task via sync engine', async () => {
    const taskId = `task-custom-${runId}`;
    const todayStr = new Date().toISOString().split('T')[0];

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sync/batch',
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: {
        deviceId: `dev-${runId}`,
        operations: [
          {
            operationId: randomUUID(),
            sequence: 1,
            type: 'TASK_CREATED',
            occurredAt: new Date().toISOString(),
            payload: {
              taskId,
              title: 'Master Space-Time Barrier',
              category: 'deep_work',
              targetHp: 25,
              startTime: '09:00',
              endTime: '10:30',
              durationMinutes: 90,
              isCustom: true
            }
          },
          {
            operationId: randomUUID(),
            sequence: 2,
            type: 'TASK_COMPLETED',
            occurredAt: new Date().toISOString(),
            payload: {
              taskId,
              completionDate: todayStr,
              taskHp: 25
            }
          }
        ]
      }
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(body.snapshots.progression);
    assert.equal(body.snapshots.progression.todayHp, 25);
    assert.equal(body.snapshots.progression.lifetimeHp, 25);
    assert.equal(body.snapshots.progression.totalXp, 25);
  });

  test('4. User A claims achievement with level-scaled XP only (0 HP)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sync/batch',
      headers: { Authorization: `Bearer ${tokenA}` },
      payload: {
        deviceId: `dev-${runId}`,
        operations: [
          {
            operationId: randomUUID(),
            sequence: 3,
            type: 'ACHIEVEMENT_CLAIMED',
            occurredAt: new Date().toISOString(),
            payload: {
              achievementId: 'streak-1',
              rarity: 'common'
            }
          }
        ]
      }
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(body.snapshots.progression);
    assert.equal(body.snapshots.progression.todayHp, 25); // HP untouched
    assert.ok(body.snapshots.progression.totalXp > 25); // XP rewarded
  });

  test('5. Registers User B and issues separate access token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: userBEmail, password: userBPassword }
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    tokenB = body.accessToken;
    userIdB = body.user.id;
    assert.notEqual(userIdA, userIdB);
  });

  test('6. User B attempt to claim User A handle returns 409 Conflict', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/auth/profile',
      headers: { Authorization: `Bearer ${tokenB}` },
      payload: {
        handle: uniqueHandleA
      }
    });

    assert.equal(res.statusCode, 409);
  });

  test('7. User B sets unique handle successfully', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/auth/profile',
      headers: { Authorization: `Bearer ${tokenB}` },
      payload: {
        name: 'Roronoa Zoro',
        handle: uniqueHandleB,
        quote: 'Nothing happened.'
      }
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.user.profile.name, 'Roronoa Zoro');
    assert.equal(body.user.profile.handle, uniqueHandleB);
  });

  test('8. Multi-User Isolation: User B state is clean and isolated from User A', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/sync/state',
      headers: { Authorization: `Bearer ${tokenB}` }
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.snapshots.progression.todayHp, 0);
    assert.equal(body.snapshots.progression.totalXp, 0);
    assert.equal(body.snapshots.tasks.length, 0);
    assert.equal(body.snapshots.profile.name, 'Roronoa Zoro');
    assert.equal(body.snapshots.profile.handle, uniqueHandleB);
  });

  test('9. User A state restoration: User A data is completely intact and persistent', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/sync/state',
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.snapshots.progression.todayHp, 25);
    assert.equal(body.snapshots.tasks.length, 1);
    assert.equal(body.snapshots.tasks[0].title, 'Master Space-Time Barrier');
    assert.equal(body.snapshots.profile.name, 'Minato Namikaze');
    assert.equal(body.snapshots.profile.handle, uniqueHandleA);
  });
});
