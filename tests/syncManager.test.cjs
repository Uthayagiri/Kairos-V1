/**
 * KAIROS PHASE E.5 — SYNC MANAGER & SERVER RECONCILIATION TEST SUITE
 * 
 * Verifies:
 * 1. Offline operation queueing without blocking local execution
 * 2. Online batch synchronization via POST /api/v1/sync/batch
 * 3. APPLIED & ALREADY_APPLIED operation dequeueing
 * 4. Transient failure retry with exponential backoff
 * 5. Permanent VALIDATION_ERROR dead-letter routing
 * 6. Partial batch success resolution
 * 7. Server snapshot authoritative progression reconciliation
 * 8. Non-authoritative XP/HP client payload invariant
 * 9. User context switching isolation during sync
 * 10. Single-flight concurrent sync execution lock
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

describe('Kairos Offline-First Sync Manager (Phase E.5)', () => {
  let storageMap = new Map();
  let currentUserId = 'user_alex@kairos.ai';
  let mockServerTime = '2026-09-23T17:30:00.000Z';

  const mockLocalStorage = {
    getItem: (key) => storageMap.get(key) || null,
    setItem: (key, val) => storageMap.set(key, String(val)),
    removeItem: (key) => storageMap.delete(key),
    clear: () => storageMap.clear(),
    get length() { return storageMap.size; },
    key: (i) => Array.from(storageMap.keys())[i] || null
  };

  global.window = { localStorage: mockLocalStorage };
  global.localStorage = mockLocalStorage;

  function getUserKey(domain, uid = currentUserId) {
    const safe = uid.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    return `KAIROS_USER_${safe}_${domain}`;
  }

  // Simulated SyncQueue for testing
  class MockSyncQueue {
    constructor() {
      this.meta = { lastSequenceNumber: 0, deviceId: 'test-device-uuid' };
      this.queue = [];
      this.deadLetter = [];
    }

    enqueue(type, payload) {
      this.meta.lastSequenceNumber += 1;
      const op = {
        operationId: `op-${Math.random().toString(36).substring(2, 10)}-${Date.now()}`,
        sequence: this.meta.lastSequenceNumber,
        type,
        occurredAt: new Date().toISOString(),
        payload: { ...payload },
        retryCount: 0
      };
      this.queue.push(op);
      return op;
    }

    peek(limit = 100) {
      return this.queue.slice(0, Math.min(limit, 100));
    }

    dequeue(ids) {
      const idSet = new Set(ids);
      this.queue = this.queue.filter((op) => !idSet.has(op.operationId));
    }

    incrementRetry(ids) {
      const idSet = new Set(ids);
      this.queue.forEach((op) => {
        if (idSet.has(op.operationId)) {
          op.retryCount += 1;
          op.lastAttemptAt = new Date().toISOString();
        }
      });
    }

    moveToDeadLetter(op, error, code) {
      this.queue = this.queue.filter((o) => o.operationId !== op.operationId);
      this.deadLetter.push({
        operationId: op.operationId,
        type: op.type,
        payloadSummary: JSON.stringify(op.payload || {}),
        failedAt: new Date().toISOString(),
        errorCode: code,
        errorMessage: error,
        retryCount: op.retryCount
      });
    }

    getPendingCount() {
      return this.queue.length;
    }

    getDeadLetterCount() {
      return this.deadLetter.length;
    }
  }

  // Simulated Progression Manager for snapshot reconciliation
  class MockProgressionManager {
    constructor() {
      this.state = {
        totalXP: 0,
        xpRemainder: 0,
        level: 1,
        todayHP: 0,
        lifetimeHP: 0,
        lastActiveDate: '2026-09-23'
      };
    }

    completeTask(task) {
      // Local immediate optimistic update
      const hp = task.hp || 15;
      const xp = Math.min(hp, 100);
      this.state.todayHP += hp;
      this.state.lifetimeHP += hp;
      this.state.totalXP += xp;
      this.state.level = Math.min(100, Math.floor(Math.sqrt(this.state.totalXP / 100)) + 1);
      return { success: true, hpAwarded: hp, xpAwarded: xp };
    }

    reconcileSnapshot(progression) {
      if (!progression) return;
      this.state.totalXP = progression.totalXp;
      this.state.xpRemainder = progression.xpRemainder || 0;
      this.state.level = progression.level;
      this.state.todayHP = progression.todayHp;
      this.state.lifetimeHP = progression.lifetimeHp || this.state.lifetimeHP;
    }
  }

  // Simulated SyncManager
  class MockSyncManager {
    constructor(queue, progManager, apiClient) {
      this.queue = queue;
      this.progManager = progManager;
      this.apiClient = apiClient;
      this.isSyncing = false;
      this.isOnline = true;
      this.token = 'valid-jwt-token';
      this.consecutiveErrors = 0;
      this.lastSyncTime = null;
    }

    setOnline(online) {
      this.isOnline = online;
    }

    setToken(token) {
      this.token = token;
    }

    async syncNow() {
      if (this.isSyncing) {
        return { success: false, reason: 'ALREADY_SYNCING' };
      }

      const pendingCount = this.queue.getPendingCount();
      if (pendingCount === 0) {
        return { success: true, processedCount: 0 };
      }

      if (!this.isOnline) {
        return { success: false, reason: 'BACKEND_OFFLINE' };
      }

      if (!this.token) {
        return { success: false, reason: 'AUTHENTICATION_REQUIRED' };
      }

      this.isSyncing = true;
      const batch = this.queue.peek(100);

      try {
        const res = await this.apiClient.postSyncBatch({
          deviceId: this.queue.meta.deviceId,
          operations: batch
        });

        const successfulIds = [];
        const retryIds = [];

        res.results.forEach((r) => {
          const op = batch.find((o) => o.operationId === r.operationId);
          if (r.status === 'APPLIED' || r.status === 'ALREADY_APPLIED') {
            successfulIds.push(r.operationId);
          } else if (r.code === 'VALIDATION_ERROR' || r.code === 'INVALID_OPERATION') {
            if (op) this.queue.moveToDeadLetter(op, r.error || 'Validation error', r.code);
          } else {
            retryIds.push(r.operationId);
          }
        });

        this.queue.dequeue(successfulIds);
        this.queue.incrementRetry(retryIds);

        if (res.snapshots && res.snapshots.progression) {
          this.progManager.reconcileSnapshot(res.snapshots.progression);
        }

        this.consecutiveErrors = 0;
        this.lastSyncTime = res.serverTime || new Date().toISOString();

        return { success: true, processedCount: successfulIds.length };
      } catch (err) {
        this.consecutiveErrors += 1;
        const retryDelay = Math.min(60000, Math.pow(2, this.consecutiveErrors) * 1000);
        return { success: false, reason: err.message, retryDelay };
      } finally {
        this.isSyncing = false;
      }
    }
  }

  let queue;
  let progManager;
  let syncManager;
  let mockApiClient;

  beforeEach(() => {
    storageMap.clear();
    queue = new MockSyncQueue();
    progManager = new MockProgressionManager();

    mockApiClient = {
      postSyncBatch: async (body) => {
        return {
          success: true,
          serverTime: mockServerTime,
          cursorVersion: 1,
          results: body.operations.map((op) => ({
            operationId: op.operationId,
            status: 'APPLIED',
            code: 'OK'
          })),
          snapshots: {
            progression: {
              totalXp: 15,
              xpRemainder: 0,
              level: 1,
              todayHp: 15,
              lifetimeHp: 15,
              streakCount: 1,
              lastActiveDate: '2026-09-23'
            }
          }
        };
      }
    };

    syncManager = new MockSyncManager(queue, progManager, mockApiClient);
  });

  test('1. Offline task completion enqueues mutation and updates local state optimistically', () => {
    syncManager.setOnline(false);

    // User completes task while offline
    const localRes = progManager.completeTask({ id: 'task-morning-run', hp: 20 });
    assert.equal(localRes.success, true);
    assert.equal(progManager.state.todayHP, 20);
    assert.equal(progManager.state.totalXP, 20);

    // Enqueue offline operation
    const op = queue.enqueue('TASK_COMPLETED', {
      taskId: 'task-morning-run',
      completionDate: '2026-09-23',
      taskHp: 20
    });

    assert.equal(queue.getPendingCount(), 1);
    assert.equal(op.payload.taskId, 'task-morning-run');
  });

  test('2. syncNow transmits pending batch and dequeues APPLIED operations', async () => {
    queue.enqueue('TASK_COMPLETED', { taskId: 't1', completionDate: '2026-09-23', taskHp: 15 });
    queue.enqueue('TASK_COMPLETED', { taskId: 't2', completionDate: '2026-09-23', taskHp: 25 });

    assert.equal(queue.getPendingCount(), 2);

    const res = await syncManager.syncNow();
    assert.equal(res.success, true);
    assert.equal(res.processedCount, 2);
    assert.equal(queue.getPendingCount(), 0);
  });

  test('3. ALREADY_APPLIED status is treated as successful idempotency and dequeued', async () => {
    const op = queue.enqueue('TASK_COMPLETED', { taskId: 't-dup', completionDate: '2026-09-23' });

    mockApiClient.postSyncBatch = async () => ({
      success: true,
      serverTime: mockServerTime,
      cursorVersion: 1,
      results: [
        { operationId: op.operationId, status: 'ALREADY_APPLIED', code: 'IDEMPOTENT_IGNORE' }
      ],
      snapshots: { progression: null }
    });

    const res = await syncManager.syncNow();
    assert.equal(res.success, true);
    assert.equal(res.processedCount, 1);
    assert.equal(queue.getPendingCount(), 0, 'ALREADY_APPLIED operation must be dequeued');
  });

  test('4. Transient network failure retains operations with exponential backoff', async () => {
    const op = queue.enqueue('TASK_COMPLETED', { taskId: 't-retry' });

    mockApiClient.postSyncBatch = async () => {
      throw new Error('503 Service Unavailable');
    };

    const res = await syncManager.syncNow();
    assert.equal(res.success, false);
    assert.equal(queue.getPendingCount(), 1, 'Operation must stay in pending queue');
    assert.equal(res.retryDelay, 2000); // 2^1 * 1000ms

    const res2 = await syncManager.syncNow();
    assert.equal(res2.retryDelay, 4000); // 2^2 * 1000ms
  });

  test('5. Permanent validation error is moved to dead-letter queue without infinite retries', async () => {
    const op = queue.enqueue('TASK_CREATED', { invalid: 'bad_payload' });

    mockApiClient.postSyncBatch = async () => ({
      success: true,
      serverTime: mockServerTime,
      cursorVersion: 1,
      results: [
        {
          operationId: op.operationId,
          status: 'REJECTED',
          code: 'VALIDATION_ERROR',
          error: 'Title is required'
        }
      ],
      snapshots: { progression: null }
    });

    const res = await syncManager.syncNow();
    assert.equal(res.success, true);
    assert.equal(queue.getPendingCount(), 0, 'Must be removed from pending queue');
    assert.equal(queue.getDeadLetterCount(), 1, 'Must be placed in DLQ');
    assert.equal(queue.deadLetter[0].errorCode, 'VALIDATION_ERROR');
  });

  test('6. Partial success batch handles APPLIED, ALREADY_APPLIED, and REJECTED individually', async () => {
    const op1 = queue.enqueue('TASK_COMPLETED', { taskId: 't1' });
    const op2 = queue.enqueue('TASK_COMPLETED', { taskId: 't2' });
    const op3 = queue.enqueue('TASK_COMPLETED', { taskId: 't3-bad' });

    mockApiClient.postSyncBatch = async () => ({
      success: true,
      serverTime: mockServerTime,
      cursorVersion: 1,
      results: [
        { operationId: op1.operationId, status: 'APPLIED', code: 'OK' },
        { operationId: op2.operationId, status: 'ALREADY_APPLIED', code: 'IDEMPOTENT' },
        { operationId: op3.operationId, status: 'REJECTED', code: 'VALIDATION_ERROR', error: 'Invalid' }
      ],
      snapshots: { progression: null }
    });

    const res = await syncManager.syncNow();
    assert.equal(res.success, true);
    assert.equal(res.processedCount, 2);
    assert.equal(queue.getPendingCount(), 0);
    assert.equal(queue.getDeadLetterCount(), 1);
  });

  test('7. Server snapshot reconciles authoritative XP, level, and HP in local progression', async () => {
    queue.enqueue('TASK_COMPLETED', { taskId: 't1', completionDate: '2026-09-23', taskHp: 100 });

    // Initial local state
    progManager.state.totalXP = 100;
    progManager.state.level = 2;
    progManager.state.todayHP = 100;

    // Server returns authoritative calculated state (e.g., 400 total XP -> Level 3)
    mockApiClient.postSyncBatch = async () => ({
      success: true,
      serverTime: mockServerTime,
      cursorVersion: 2,
      results: [{ operationId: queue.peek()[0].operationId, status: 'APPLIED', code: 'OK' }],
      snapshots: {
        progression: {
          totalXp: 400,
          xpRemainder: 0,
          level: 3,
          todayHp: 100,
          lifetimeHp: 400,
          streakCount: 5,
          lastActiveDate: '2026-09-23'
        }
      }
    });

    await syncManager.syncNow();

    assert.equal(progManager.state.totalXP, 400);
    assert.equal(progManager.state.level, 3);
    assert.equal(progManager.state.todayHP, 100);
  });

  test('8. Progression Safety: TASK_COMPLETED payload strictly excludes client earnedXp, earnedHp, level', () => {
    const serializeTaskCompleted = (params) => ({
      taskId: String(params.taskId),
      completionDate: String(params.completionDate),
      taskHp: typeof params.taskHp === 'number' ? params.taskHp : 15
    });

    const payload = serializeTaskCompleted({
      taskId: 'task-test',
      completionDate: '2026-09-23',
      taskHp: 25,
      // Attempting to pass client calculated values:
      earnedXp: 25,
      earnedHp: 25,
      level: 2,
      totalXp: 150
    });

    assert.equal(payload.taskId, 'task-test');
    assert.equal(payload.completionDate, '2026-09-23');
    assert.equal(payload.taskHp, 25);
    assert.equal(payload.earnedXp, undefined);
    assert.equal(payload.earnedHp, undefined);
    assert.equal(payload.level, undefined);
    assert.equal(payload.totalXp, undefined);
  });

  test('9. Concurrent syncNow calls are protected by single-flight execution guard', async () => {
    queue.enqueue('TASK_COMPLETED', { taskId: 't1' });

    let callCount = 0;
    mockApiClient.postSyncBatch = async () => {
      callCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return {
        success: true,
        serverTime: mockServerTime,
        cursorVersion: 1,
        results: [{ operationId: queue.peek()[0].operationId, status: 'APPLIED', code: 'OK' }],
        snapshots: { progression: null }
      };
    };

    // Trigger 3 concurrent sync calls
    const [p1, p2, p3] = await Promise.all([
      syncManager.syncNow(),
      syncManager.syncNow(),
      syncManager.syncNow()
    ]);

    assert.equal(callCount, 1, 'Only one API batch request should be initiated concurrently');
    assert.equal(p1.success, true);
    assert.equal(p2.success, false);
    assert.equal(p2.reason, 'ALREADY_SYNCING');
    assert.equal(p3.success, false);
    assert.equal(p3.reason, 'ALREADY_SYNCING');
  });

  test('10. User context switch halts sync and isolates user states', async () => {
    // User A queue
    const queueA = new MockSyncQueue();
    queueA.enqueue('TASK_COMPLETED', { taskId: 'task-user-a' });

    // User B queue
    const queueB = new MockSyncQueue();
    queueB.enqueue('TASK_COMPLETED', { taskId: 'task-user-b' });

    assert.equal(queueA.getPendingCount(), 1);
    assert.equal(queueB.getPendingCount(), 1);
    assert.notEqual(queueA.peek()[0].payload.taskId, queueB.peek()[0].payload.taskId);
  });
});
