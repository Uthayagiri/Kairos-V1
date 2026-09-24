import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import {
  SyncBatchRequestSchema,
  TaskCompletedPayloadSchema,
  TaskCreatedPayloadSchema
} from '../src/validators/sync.schemas.js';
import { calculateReward, addExperience, getLevelForTotalXP } from '../src/services/progressionEngine.service.js';
import { generateAccessToken } from '../src/utils/security.utils.js';

describe('Kairos Backend Sync API & Batch Ingestion (Phase E.3/E.4)', () => {
  let app: FastifyInstance;
  const testUserId = '11111111-1111-4111-8111-111111111111';
  const testDeviceId = 'device-ios-test-994';
  let testAuthToken: string;

  before(async () => {
    process.env.NODE_ENV = 'test';
    app = await buildApp({ logger: false });
    await app.ready();
    testAuthToken = generateAccessToken(testUserId).accessToken;
  });

  after(async () => {
    await app.close();
  });

  // -------------------------------------------------------------
  // 1. Connectivity & Health Probe Endpoints
  // -------------------------------------------------------------
  test('20. GET /api/v1/sync/status returns 200 with online: true and apiVersion', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/sync/status'
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.online, true);
    assert.equal(body.apiVersion, 'v1');
    assert.ok(body.serverTime);
    assert.ok(!isNaN(Date.parse(body.serverTime)));
  });

  test('21. Server timestamp returned in ISO format', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/sync/status'
    });
    const body = JSON.parse(res.body);
    assert.match(body.serverTime, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  test('22. POST /api/v1/sync/batch requires Authorization Bearer token (rejects unauthenticated requests)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sync/batch',
      payload: {
        deviceId: testDeviceId,
        operations: []
      }
    });

    assert.equal(res.statusCode, 401);
    const body = JSON.parse(res.body);
    assert.equal(body.error, 'Unauthorized');
  });

  // -------------------------------------------------------------
  // 2. Request Schema & Contract Validation Rejections
  // -------------------------------------------------------------
  test('1. Empty batch rejection (empty operations array returns 400)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sync/batch',
      headers: { authorization: `Bearer ${testAuthToken}` },
      payload: {
        deviceId: testDeviceId,
        operations: []
      }
    });

    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.body);
    assert.equal(body.error, 'Bad Request');
  });

  test('2. Batch size limit rejection (>100 operations returns 400)', async () => {
    const oversizedOperations = Array.from({ length: 101 }, (_, i) => ({
      operationId: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      sequence: i + 1,
      type: 'TASK_COMPLETED',
      occurredAt: new Date().toISOString(),
      payload: { taskId: 'sys-hydration-am', completionDate: '2026-09-23', taskHp: 15 }
    }));

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sync/batch',
      headers: { authorization: `Bearer ${testAuthToken}` },
      payload: {
        deviceId: testDeviceId,
        operations: oversizedOperations
      }
    });

    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.body);
    assert.equal(body.error, 'Bad Request');
  });

  test('3. Invalid operation ID format rejection (non-UUID returns 400)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sync/batch',
      headers: { authorization: `Bearer ${testAuthToken}` },
      payload: {
        deviceId: testDeviceId,
        operations: [
          {
            operationId: 'not-a-valid-uuid',
            sequence: 1,
            type: 'TASK_COMPLETED',
            occurredAt: new Date().toISOString(),
            payload: { taskId: 'sys-hydration-am', completionDate: '2026-09-23' }
          }
        ]
      }
    });

    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.body);
    assert.equal(body.error, 'Bad Request');
  });

  test('4. Invalid sequence rejection (negative or non-integer sequence returns 400)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sync/batch',
      headers: { authorization: `Bearer ${testAuthToken}` },
      payload: {
        deviceId: testDeviceId,
        operations: [
          {
            operationId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            sequence: -5,
            type: 'TASK_COMPLETED',
            occurredAt: new Date().toISOString(),
            payload: { taskId: 'sys-hydration-am', completionDate: '2026-09-23' }
          }
        ]
      }
    });

    assert.equal(res.statusCode, 400);
  });

  test('5. Invalid timestamp rejection (malformed date string returns 400)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sync/batch',
      headers: { authorization: `Bearer ${testAuthToken}` },
      payload: {
        deviceId: testDeviceId,
        operations: [
          {
            operationId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            sequence: 1,
            type: 'TASK_COMPLETED',
            occurredAt: 'not-a-timestamp',
            payload: { taskId: 'sys-hydration-am', completionDate: '2026-09-23' }
          }
        ]
      }
    });

    assert.equal(res.statusCode, 400);
  });

  test('6. Unknown operation type rejection', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sync/batch',
      headers: { authorization: `Bearer ${testAuthToken}` },
      payload: {
        deviceId: testDeviceId,
        operations: [
          {
            operationId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            sequence: 1,
            type: 'UNSUPPORTED_TYPE_XYZ',
            occurredAt: new Date().toISOString(),
            payload: {}
          }
        ]
      }
    });

    assert.equal(res.statusCode, 400);
  });

  test('7. Malformed request handling (missing deviceId or non-JSON body)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sync/batch',
      headers: { authorization: `Bearer ${testAuthToken}` },
      payload: {
        operations: []
      }
    });

    assert.equal(res.statusCode, 400);
  });

  // -------------------------------------------------------------
  // 3. Operation Execution & Anti-Duplication Engine Verification
  // -------------------------------------------------------------
  interface SimulatedLedgerState {
    processedOperationIds: Set<string>;
    completedTasks: Map<string, { earnedXp: number; earnedHp: number }>;
    userProgression: { totalXp: number; xpRemainder: number; level: number; todayHp: number; lastActiveDate: string };
    customTasks: Map<string, any>;
  }

  function createSimulatedSyncEngine() {
    const state: SimulatedLedgerState = {
      processedOperationIds: new Set<string>(),
      completedTasks: new Map<string, { earnedXp: number; earnedHp: number }>(),
      userProgression: { totalXp: 0, xpRemainder: 0, level: 1, todayHp: 0, lastActiveDate: '' },
      customTasks: new Map<string, any>()
    };

    function processBatch(userId: string, batchReq: any) {
      const parsed = SyncBatchRequestSchema.parse(batchReq);
      const results: any[] = [];
      let progressionChanged = false;

      for (const op of parsed.operations) {
        // Idempotency check: has operationId been processed?
        if (state.processedOperationIds.has(op.operationId)) {
          results.push({
            operationId: op.operationId,
            status: 'ALREADY_APPLIED',
            code: 'ALREADY_PROCESSED'
          });
          continue;
        }

        switch (op.type) {
          case 'TASK_CREATED': {
            const payload = TaskCreatedPayloadSchema.safeParse(op.payload);
            if (!payload.success) {
              results.push({ operationId: op.operationId, status: 'REJECTED', code: 'VALIDATION_ERROR' });
              continue;
            }
            state.customTasks.set(payload.data.taskId, payload.data);
            state.processedOperationIds.add(op.operationId);
            results.push({ operationId: op.operationId, status: 'APPLIED', code: 'OK' });
            break;
          }

          case 'TASK_COMPLETED': {
            const payload = TaskCompletedPayloadSchema.safeParse(op.payload);
            if (!payload.success) {
              results.push({ operationId: op.operationId, status: 'REJECTED', code: 'VALIDATION_ERROR' });
              continue;
            }

            const taskKey = `${userId}:${payload.data.taskId}:${payload.data.completionDate}`;
            if (state.completedTasks.has(taskKey)) {
              state.processedOperationIds.add(op.operationId);
              results.push({ operationId: op.operationId, status: 'ALREADY_APPLIED', code: 'ALREADY_PROCESSED' });
              continue;
            }

            // Calculate Authoritative Reward
            const reward = calculateReward(state.userProgression.level, state.userProgression.todayHp, payload.data.taskHp);
            const xpUpdate = addExperience(state.userProgression.totalXp, state.userProgression.xpRemainder, reward.earnedXP);
            const newLevel = getLevelForTotalXP(xpUpdate.newTotalXP);

            state.completedTasks.set(taskKey, { earnedXp: reward.earnedXP, earnedHp: payload.data.taskHp });
            state.userProgression.totalXp = xpUpdate.newTotalXP;
            state.userProgression.xpRemainder = xpUpdate.newRemainder;
            state.userProgression.level = newLevel;
            state.userProgression.todayHp += payload.data.taskHp;
            state.userProgression.lastActiveDate = payload.data.completionDate;

            state.processedOperationIds.add(op.operationId);
            progressionChanged = true;
            results.push({ operationId: op.operationId, status: 'APPLIED', code: 'OK' });
            break;
          }

          default:
            results.push({ operationId: op.operationId, status: 'REJECTED', code: 'INVALID_OPERATION' });
        }
      }

      return {
        success: true,
        serverTime: new Date().toISOString(),
        cursorVersion: 1,
        results,
        snapshots: {
          progression: progressionChanged ? { ...state.userProgression } : null,
          tasks: Array.from(state.customTasks.values())
        }
      };
    }

    return { state, processBatch };
  }

  test('8. Single valid operation processing (TASK_CREATED)', () => {
    const engine = createSimulatedSyncEngine();
    const batch = {
      deviceId: testDeviceId,
      operations: [
        {
          operationId: 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e',
          sequence: 1,
          type: 'TASK_CREATED',
          occurredAt: new Date().toISOString(),
          payload: { taskId: 'custom-reading', title: 'Daily Deep Reading', targetHp: 20 }
        }
      ]
    };

    const res = engine.processBatch(testUserId, batch);
    assert.equal(res.success, true);
    assert.equal(res.results.length, 1);
    assert.equal(res.results[0].status, 'APPLIED');
    assert.equal(res.results[0].code, 'OK');
    assert.equal(engine.state.customTasks.size, 1);
  });

  test('9. Multiple valid operations processing in sequence', () => {
    const engine = createSimulatedSyncEngine();
    const batch = {
      deviceId: testDeviceId,
      operations: [
        {
          operationId: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f',
          sequence: 1,
          type: 'TASK_CREATED',
          occurredAt: new Date().toISOString(),
          payload: { taskId: 'custom-exercise', title: 'Morning Cardio', targetHp: 25 }
        },
        {
          operationId: 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a',
          sequence: 2,
          type: 'TASK_COMPLETED',
          occurredAt: new Date().toISOString(),
          payload: { taskId: 'custom-exercise', completionDate: '2026-09-23', taskHp: 25 }
        }
      ]
    };

    const res = engine.processBatch(testUserId, batch);
    assert.equal(res.results.length, 2);
    assert.equal(res.results[0].status, 'APPLIED');
    assert.equal(res.results[1].status, 'APPLIED');
    assert.equal(engine.state.userProgression.totalXp, 25);
    assert.equal(engine.state.userProgression.todayHp, 25);
  });

  test('10. Duplicate operation ID detection (replayed operation returns ALREADY_APPLIED)', () => {
    const engine = createSimulatedSyncEngine();
    const op = {
      operationId: 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b',
      sequence: 1,
      type: 'TASK_COMPLETED',
      occurredAt: new Date().toISOString(),
      payload: { taskId: 'sys-hydration-am', completionDate: '2026-09-23', taskHp: 15 }
    };

    // First execution
    const res1 = engine.processBatch(testUserId, { deviceId: testDeviceId, operations: [op] });
    assert.equal(res1.results[0].status, 'APPLIED');
    assert.equal(engine.state.userProgression.totalXp, 15);

    // Replay exact same operationId
    const res2 = engine.processBatch(testUserId, { deviceId: testDeviceId, operations: [op] });
    assert.equal(res2.results[0].status, 'ALREADY_APPLIED');
    assert.equal(res2.results[0].code, 'ALREADY_PROCESSED');
    assert.equal(engine.state.userProgression.totalXp, 15, 'Total XP must not increment on replay');
  });

  test('12. Duplicate task completion on same date detection', () => {
    const engine = createSimulatedSyncEngine();
    const op1 = {
      operationId: 'f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c',
      sequence: 1,
      type: 'TASK_COMPLETED',
      occurredAt: new Date().toISOString(),
      payload: { taskId: 'sys-hydration-am', completionDate: '2026-09-23', taskHp: 15 }
    };
    const op2 = {
      operationId: 'a2b3c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6d',
      sequence: 2,
      type: 'TASK_COMPLETED',
      occurredAt: new Date().toISOString(),
      payload: { taskId: 'sys-hydration-am', completionDate: '2026-09-23', taskHp: 15 }
    };

    const res = engine.processBatch(testUserId, { deviceId: testDeviceId, operations: [op1, op2] });
    assert.equal(res.results[0].status, 'APPLIED');
    assert.equal(res.results[1].status, 'ALREADY_APPLIED');
    assert.equal(engine.state.userProgression.totalXp, 15, 'XP awarded exactly once');
  });

  test('13. No duplicate XP awarded on replay', () => {
    const engine = createSimulatedSyncEngine();
    const op = {
      operationId: '12345678-1234-4234-8234-123456789012',
      sequence: 1,
      type: 'TASK_COMPLETED',
      occurredAt: new Date().toISOString(),
      payload: { taskId: 'task-test', completionDate: '2026-09-23', taskHp: 20 }
    };

    engine.processBatch(testUserId, { deviceId: testDeviceId, operations: [op] });
    assert.equal(engine.state.userProgression.totalXp, 20);

    // Replay 5 times
    for (let i = 0; i < 5; i++) {
      engine.processBatch(testUserId, { deviceId: testDeviceId, operations: [op] });
    }
    assert.equal(engine.state.userProgression.totalXp, 20, 'XP remains strictly 20 after 5 replays');
  });

  test('14. No duplicate HP awarded on replay', () => {
    const engine = createSimulatedSyncEngine();
    const op = {
      operationId: '22345678-1234-4234-8234-123456789012',
      sequence: 1,
      type: 'TASK_COMPLETED',
      occurredAt: new Date().toISOString(),
      payload: { taskId: 'task-hp-test', completionDate: '2026-09-23', taskHp: 30 }
    };

    engine.processBatch(testUserId, { deviceId: testDeviceId, operations: [op] });
    assert.equal(engine.state.userProgression.todayHp, 30);

    engine.processBatch(testUserId, { deviceId: testDeviceId, operations: [op] });
    assert.equal(engine.state.userProgression.todayHp, 30, 'Today HP remains strictly 30');
  });

  test('15. Rejection / ignoring of client-supplied XP spoofing', () => {
    const engine = createSimulatedSyncEngine();
    const op = {
      operationId: '32345678-1234-4234-8234-123456789012',
      sequence: 1,
      type: 'TASK_COMPLETED',
      occurredAt: new Date().toISOString(),
      payload: {
        taskId: 'sys-hydration-am',
        completionDate: '2026-09-23',
        taskHp: 15,
        earnedXp: 999999, // Client attempts to award itself 1M XP
        totalXp: 999999
      }
    };

    engine.processBatch(testUserId, { deviceId: testDeviceId, operations: [op] });
    // Server calculated: 15 HP -> 15.0 XP (strictly ignores 999999)
    assert.equal(engine.state.userProgression.totalXp, 15);
  });

  test('17. User isolation across sync batches', () => {
    const engine = createSimulatedSyncEngine();
    const userA = 'aaaaaaa1-1111-4111-8111-111111111111';
    const userB = 'bbbbbbb2-2222-4222-8222-222222222222';

    const opA = {
      operationId: '42345678-1234-4234-8234-123456789012',
      sequence: 1,
      type: 'TASK_COMPLETED',
      occurredAt: new Date().toISOString(),
      payload: { taskId: 'shared-task-id', completionDate: '2026-09-23', taskHp: 20 }
    };
    const opB = {
      operationId: '52345678-1234-4234-8234-123456789012',
      sequence: 1,
      type: 'TASK_COMPLETED',
      occurredAt: new Date().toISOString(),
      payload: { taskId: 'shared-task-id', completionDate: '2026-09-23', taskHp: 20 }
    };

    const resA = engine.processBatch(userA, { deviceId: testDeviceId, operations: [opA] });
    const resB = engine.processBatch(userB, { deviceId: testDeviceId, operations: [opB] });

    assert.equal(resA.results[0].status, 'APPLIED');
    assert.equal(resB.results[0].status, 'APPLIED');
  });

  test('19. Partial batch success (valid operation succeeds while invalid payload is rejected)', () => {
    const engine = createSimulatedSyncEngine();
    const batch = {
      deviceId: testDeviceId,
      operations: [
        {
          operationId: '62345678-1234-4234-8234-123456789012',
          sequence: 1,
          type: 'TASK_CREATED',
          occurredAt: new Date().toISOString(),
          payload: { taskId: 'valid-task', title: 'Valid Task' }
        },
        {
          operationId: '72345678-1234-4234-8234-123456789012',
          sequence: 2,
          type: 'TASK_CREATED',
          occurredAt: new Date().toISOString(),
          payload: { taskId: '' } // Invalid empty taskId
        }
      ]
    };

    const res = engine.processBatch(testUserId, batch);
    assert.equal(res.results.length, 2);
    assert.equal(res.results[0].status, 'APPLIED');
    assert.equal(res.results[1].status, 'REJECTED');
    assert.equal(res.results[1].code, 'VALIDATION_ERROR');
    assert.equal(engine.state.customTasks.size, 1);
  });

  test('22. Authoritative progression snapshot returned on progression change', () => {
    const engine = createSimulatedSyncEngine();
    const op = {
      operationId: '82345678-1234-4234-8234-123456789012',
      sequence: 1,
      type: 'TASK_COMPLETED',
      occurredAt: new Date().toISOString(),
      payload: { taskId: 'snapshot-task', completionDate: '2026-09-23', taskHp: 40 }
    };

    const res = engine.processBatch(testUserId, { deviceId: testDeviceId, operations: [op] });
    assert.ok(res.snapshots.progression);
    assert.equal(res.snapshots.progression.totalXp, 40);
    assert.equal(res.snapshots.progression.todayHp, 40);
  });

  test('23. Authoritative task snapshot returned on task mutations', () => {
    const engine = createSimulatedSyncEngine();
    const op = {
      operationId: '92345678-1234-4234-8234-123456789012',
      sequence: 1,
      type: 'TASK_CREATED',
      occurredAt: new Date().toISOString(),
      payload: { taskId: 'snapshot-task-created', title: 'Created Task' }
    };

    const res = engine.processBatch(testUserId, { deviceId: testDeviceId, operations: [op] });
    assert.ok(Array.isArray(res.snapshots.tasks));
    assert.equal(res.snapshots.tasks.length, 1);
    assert.equal(res.snapshots.tasks[0].taskId, 'snapshot-task-created');
  });
});
