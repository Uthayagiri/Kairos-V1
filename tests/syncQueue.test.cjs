/**
 * KAIROS PHASE E.5 — SYNC QUEUE & OFFLINE STORAGE TEST SUITE
 * 
 * Verifies:
 * 1. Operation generation with stable UUID operationId
 * 2. Monotonic sequence counter per user partition
 * 3. Payload sanitization (no passwords/tokens)
 * 4. Deterministic sequence ordering on peek (up to 100 items)
 * 5. Persistence across storage reload
 * 6. User partition queue isolation (User A vs User B)
 * 7. Dequeueing applied operations
 * 8. Retry count tracking and timestamping
 * 9. Bounded dead-letter queue (max 50 items)
 * 10. Account purge cleanup
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

describe('Kairos Offline Sync Queue (Phase E.5)', () => {
  // In-memory mock localStorage
  let storageMap = new Map();

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

  // Scoped storage helper mock
  let currentActiveUserId = 'user_default';

  function normalizeUserId(id) {
    if (!id) return 'default';
    if (typeof id === 'object') {
      const candidate = id.email || id.id || id.username || id.name;
      return candidate ? String(candidate).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_') : 'default';
    }
    return String(id).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  }

  function setActiveUserId(id) {
    currentActiveUserId = normalizeUserId(id);
  }

  function getUserStorageKey(domain, uid = currentActiveUserId) {
    return `KAIROS_USER_${uid}_${domain}`;
  }

  function getUserScopedJSON(domain, defaultValue) {
    const key = getUserStorageKey(domain);
    const raw = mockLocalStorage.getItem(key);
    if (!raw) return defaultValue;
    try {
      return JSON.parse(raw);
    } catch {
      return defaultValue;
    }
  }

  function setUserScopedJSON(domain, value) {
    const key = getUserStorageKey(domain);
    mockLocalStorage.setItem(key, JSON.stringify(value));
  }

  function clearUserScopedData(uid = currentActiveUserId) {
    const userPrefix = `KAIROS_USER_${uid}_`;
    const keysToRemove = [];
    for (let i = 0; i < mockLocalStorage.length; i++) {
      const k = mockLocalStorage.key(i);
      if (k && k.startsWith(userPrefix)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => mockLocalStorage.removeItem(k));
  }

  // Model-under-test implementation
  class SyncQueueTestInstance {
    constructor() {
      this.meta = this.loadMeta();
      this.queue = this.loadQueue();
      this.deadLetter = this.loadDLQ();
    }

    loadMeta() {
      const raw = getUserScopedJSON('SYNC_META_V1', null);
      if (raw) {
        return {
          lastSequenceNumber: typeof raw.lastSequenceNumber === 'number' ? raw.lastSequenceNumber : 0,
          lastSyncServerTime: raw.lastSyncServerTime,
          lastSyncSuccess: raw.lastSyncSuccess,
          cursorVersion: raw.cursorVersion || 1,
          deviceId: raw.deviceId || 'device-test-123'
        };
      }
      return { lastSequenceNumber: 0, deviceId: 'device-test-123' };
    }

    saveMeta() {
      setUserScopedJSON('SYNC_META_V1', this.meta);
    }

    loadQueue() {
      const q = getUserScopedJSON('SYNC_QUEUE_V1', null);
      return Array.isArray(q) ? q : [];
    }

    saveQueue() {
      setUserScopedJSON('SYNC_QUEUE_V1', this.queue);
    }

    loadDLQ() {
      const dlq = getUserScopedJSON('SYNC_DEAD_LETTER_V1', null);
      return Array.isArray(dlq) ? dlq : [];
    }

    saveDLQ() {
      const capped = this.deadLetter.slice(-50);
      setUserScopedJSON('SYNC_DEAD_LETTER_V1', capped);
    }

    generateOperationId() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }

    enqueue(type, payload) {
      const sanitized = { ...payload };
      delete sanitized.password;
      delete sanitized.passwordHash;
      delete sanitized.token;
      delete sanitized.accessToken;
      delete sanitized.refreshToken;

      this.meta.lastSequenceNumber += 1;
      this.saveMeta();

      const op = {
        operationId: this.generateOperationId(),
        sequence: this.meta.lastSequenceNumber,
        type,
        occurredAt: new Date().toISOString(),
        payload: sanitized,
        retryCount: 0
      };

      this.queue.push(op);
      this.saveQueue();
      return op;
    }

    peek(limit = 100) {
      return this.queue
        .slice()
        .sort((a, b) => a.sequence - b.sequence)
        .slice(0, Math.min(limit, 100));
    }

    dequeue(ids) {
      const idSet = new Set(ids);
      this.queue = this.queue.filter((op) => !idSet.has(op.operationId));
      this.saveQueue();
    }

    incrementRetry(ids) {
      const idSet = new Set(ids);
      const now = new Date().toISOString();
      this.queue.forEach((op) => {
        if (idSet.has(op.operationId)) {
          op.retryCount += 1;
          op.lastAttemptAt = now;
        }
      });
      this.saveQueue();
    }

    moveToDeadLetter(operation, errorMessage, errorCode) {
      this.queue = this.queue.filter((op) => op.operationId !== operation.operationId);
      this.saveQueue();

      this.deadLetter.push({
        operationId: operation.operationId,
        type: operation.type,
        payloadSummary: JSON.stringify(operation.payload || {}).substring(0, 200),
        failedAt: new Date().toISOString(),
        errorCode,
        errorMessage,
        retryCount: operation.retryCount
      });
      if (this.deadLetter.length > 50) {
        this.deadLetter = this.deadLetter.slice(-50);
      }
      this.saveDLQ();
    }

    switchUser() {
      this.meta = this.loadMeta();
      this.queue = this.loadQueue();
      this.deadLetter = this.loadDLQ();
    }

    getPendingCount() {
      return this.queue.length;
    }

    getDeadLetterCount() {
      return this.deadLetter.length;
    }
  }

  beforeEach(() => {
    storageMap.clear();
    setActiveUserId('user_test_a');
  });

  test('1. Enqueue creates operation with UUID, timestamp, and sequence 1', () => {
    const queue = new SyncQueueTestInstance();
    const op = queue.enqueue('TASK_COMPLETED', { taskId: 'task-morning-run', completionDate: '2026-09-23' });

    assert.ok(op.operationId);
    assert.match(op.operationId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.equal(op.sequence, 1);
    assert.equal(op.type, 'TASK_COMPLETED');
    assert.equal(op.retryCount, 0);
    assert.equal(queue.getPendingCount(), 1);
  });

  test('2. Sequence numbers strictly increment per mutation', () => {
    const queue = new SyncQueueTestInstance();
    const op1 = queue.enqueue('TASK_COMPLETED', { taskId: 't1' });
    const op2 = queue.enqueue('TASK_COMPLETED', { taskId: 't2' });
    const op3 = queue.enqueue('ACHIEVEMENT_CLAIMED', { achievementId: 'ach1', rarity: 'rare' });

    assert.equal(op1.sequence, 1);
    assert.equal(op2.sequence, 2);
    assert.equal(op3.sequence, 3);
  });

  test('3. Enqueue sanitizes sensitive fields (passwords, tokens)', () => {
    const queue = new SyncQueueTestInstance();
    const op = queue.enqueue('PROFILE_UPDATED', {
      name: 'Alex Rivera',
      password: 'super_secret_password_123',
      passwordHash: '$2b$10$...',
      token: 'jwt.secret.here',
      accessToken: 'access.secret.here',
      refreshToken: 'refresh.secret.here'
    });

    assert.equal(op.payload.name, 'Alex Rivera');
    assert.equal(op.payload.password, undefined);
    assert.equal(op.payload.passwordHash, undefined);
    assert.equal(op.payload.token, undefined);
    assert.equal(op.payload.accessToken, undefined);
    assert.equal(op.payload.refreshToken, undefined);
  });

  test('4. Peek sorts operations by sequence ascending and respects max limit 100', () => {
    const queue = new SyncQueueTestInstance();
    for (let i = 1; i <= 120; i++) {
      queue.enqueue('FOCUS_SESSION_RECORDED', { sessionId: `session-${i}`, durationSeconds: 1500 });
    }

    assert.equal(queue.getPendingCount(), 120);

    const batch = queue.peek(100);
    assert.equal(batch.length, 100);
    assert.equal(batch[0].sequence, 1);
    assert.equal(batch[99].sequence, 100);

    // Verify ordering is strictly ascending
    for (let i = 0; i < batch.length - 1; i++) {
      assert.ok(batch[i].sequence < batch[i + 1].sequence);
    }
  });

  test('5. Persistence survives queue reload from storage', () => {
    const queue1 = new SyncQueueTestInstance();
    queue1.enqueue('TASK_COMPLETED', { taskId: 'task-1' });
    queue1.enqueue('TASK_COMPLETED', { taskId: 'task-2' });

    // Instantiate new queue from the same persisted storage
    const queue2 = new SyncQueueTestInstance();
    assert.equal(queue2.getPendingCount(), 2);
    assert.equal(queue2.peek()[0].payload.taskId, 'task-1');
    assert.equal(queue2.peek()[1].payload.taskId, 'task-2');

    // Next enqueue continues monotonic sequence
    const op3 = queue2.enqueue('TASK_COMPLETED', { taskId: 'task-3' });
    assert.equal(op3.sequence, 3);
  });

  test('6. User Partition Isolation: User A and User B queues never mix', () => {
    // User A queues mutations
    setActiveUserId('user_alpha@kairos.ai');
    const queueA = new SyncQueueTestInstance();
    queueA.enqueue('TASK_COMPLETED', { taskId: 'task-alpha-1' });
    queueA.enqueue('TASK_COMPLETED', { taskId: 'task-alpha-2' });
    assert.equal(queueA.getPendingCount(), 2);

    // Switch to User B
    setActiveUserId('user_beta@kairos.ai');
    const queueB = new SyncQueueTestInstance();
    assert.equal(queueB.getPendingCount(), 0, 'User B must start with an empty queue');

    queueB.enqueue('ACHIEVEMENT_CLAIMED', { achievementId: 'ach-beta-1' });
    assert.equal(queueB.getPendingCount(), 1);
    assert.equal(queueB.peek()[0].sequence, 1);

    // Switch back to User A
    setActiveUserId('user_alpha@kairos.ai');
    queueA.switchUser();
    assert.equal(queueA.getPendingCount(), 2, 'User A queue must remain completely intact');
    assert.equal(queueA.peek()[0].payload.taskId, 'task-alpha-1');
    assert.equal(queueA.peek()[1].payload.taskId, 'task-alpha-2');
  });

  test('7. Dequeueing applied operations removes them cleanly', () => {
    const queue = new SyncQueueTestInstance();
    const op1 = queue.enqueue('TASK_COMPLETED', { taskId: 't1' });
    const op2 = queue.enqueue('TASK_COMPLETED', { taskId: 't2' });
    const op3 = queue.enqueue('TASK_COMPLETED', { taskId: 't3' });

    assert.equal(queue.getPendingCount(), 3);

    queue.dequeue([op1.operationId, op3.operationId]);
    assert.equal(queue.getPendingCount(), 1);
    assert.equal(queue.peek()[0].operationId, op2.operationId);
  });

  test('8. Transient failure increments retry count and updates timestamp', () => {
    const queue = new SyncQueueTestInstance();
    const op1 = queue.enqueue('TASK_COMPLETED', { taskId: 't1' });
    assert.equal(op1.retryCount, 0);

    queue.incrementRetry([op1.operationId]);
    const refreshed = queue.peek()[0];
    assert.equal(refreshed.retryCount, 1);
    assert.ok(refreshed.lastAttemptAt);

    queue.incrementRetry([op1.operationId]);
    assert.equal(queue.peek()[0].retryCount, 2);
  });

  test('9. Dead-letter queue captures permanently failed operations and caps at 50', () => {
    const queue = new SyncQueueTestInstance();

    // Create 60 failed operations
    for (let i = 1; i <= 60; i++) {
      const op = queue.enqueue('TASK_CREATED', { invalidField: true });
      queue.moveToDeadLetter(op, 'Validation failed: title is required', 'VALIDATION_ERROR');
    }

    // Pending queue should be 0 because all moved to DLQ
    assert.equal(queue.getPendingCount(), 0);

    // DLQ should be bounded at max 50 items
    assert.equal(queue.getDeadLetterCount(), 50);
  });

  test('10. Account purge deletes user sync queue and metadata without affecting others', () => {
    // Setup User A
    setActiveUserId('user_a');
    const qA = new SyncQueueTestInstance();
    qA.enqueue('TASK_COMPLETED', { taskId: 'tA' });

    // Setup User B
    setActiveUserId('user_b');
    const qB = new SyncQueueTestInstance();
    qB.enqueue('TASK_COMPLETED', { taskId: 'tB' });

    // Purge User A
    clearUserScopedData('user_a');

    // Verify User A is empty
    setActiveUserId('user_a');
    qA.switchUser();
    assert.equal(qA.getPendingCount(), 0);

    // Verify User B is unaffected
    setActiveUserId('user_b');
    qB.switchUser();
    assert.equal(qB.getPendingCount(), 1);
    assert.equal(qB.peek()[0].payload.taskId, 'tB');
  });
});
