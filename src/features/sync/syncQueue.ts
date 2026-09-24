import {
  SyncOperation,
  SyncOperationType,
  DeadLetterOperation,
  SyncMeta
} from './syncTypes';
import {
  loadPendingQueue,
  savePendingQueue,
  loadDeadLetterQueue,
  saveDeadLetterQueue,
  loadSyncMeta,
  saveSyncMeta
} from './syncStorage';

export class SyncQueue {
  private queue: SyncOperation[] = [];
  private deadLetter: DeadLetterOperation[] = [];
  private meta: SyncMeta;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.meta = loadSyncMeta();
    this.queue = loadPendingQueue();
    this.deadLetter = loadDeadLetterQueue();
  }

  /**
   * Generates a stable UUID identifier for each mutation.
   */
  public generateOperationId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // RFC 4122 v4 compliant fallback
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Enqueues a new mutation with a stable UUID operationId and next monotonic sequence.
   */
  public enqueue(type: SyncOperationType, payload: Record<string, any>): SyncOperation {
    // 1. Sanitize payload: never enqueue passwords or authorization secrets
    const sanitizedPayload = { ...payload };
    delete (sanitizedPayload as any).password;
    delete (sanitizedPayload as any).passwordHash;
    delete (sanitizedPayload as any).token;
    delete (sanitizedPayload as any).accessToken;
    delete (sanitizedPayload as any).refreshToken;

    // 2. Monotonic sequence increment
    this.meta.lastSequenceNumber += 1;
    saveSyncMeta(this.meta);

    // 3. Create immutable operation
    const operation: SyncOperation = {
      operationId: this.generateOperationId(),
      sequence: this.meta.lastSequenceNumber,
      type,
      occurredAt: new Date().toISOString(),
      payload: sanitizedPayload,
      retryCount: 0
    };

    this.queue.push(operation);
    savePendingQueue(this.queue);
    this.notify();

    return operation;
  }

  /**
   * Retrieves up to `limit` pending operations sorted deterministically by sequence ascending.
   */
  public peek(limit = 100): SyncOperation[] {
    return this.queue
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
      .slice(0, Math.min(limit, 100));
  }

  /**
   * Dequeues operations that have been successfully APPLIED or confirmed ALREADY_APPLIED.
   */
  public dequeue(operationIds: string[]): void {
    if (!operationIds || operationIds.length === 0) return;

    const idSet = new Set(operationIds);
    this.queue = this.queue.filter((op) => !idSet.has(op.operationId));
    savePendingQueue(this.queue);
    this.notify();
  }

  /**
   * Increments retry count and records attempt timestamp for failed operations.
   */
  public incrementRetry(operationIds: string[]): void {
    if (!operationIds || operationIds.length === 0) return;

    const idSet = new Set(operationIds);
    const now = new Date().toISOString();

    this.queue.forEach((op) => {
      if (idSet.has(op.operationId)) {
        op.retryCount += 1;
        op.lastAttemptAt = now;
      }
    });

    savePendingQueue(this.queue);
    this.notify();
  }

  /**
   * Moves a permanently failed operation to the dead-letter log to avoid infinite retry loops.
   */
  public moveToDeadLetter(operation: SyncOperation, errorMessage: string, errorCode: string): void {
    // Remove from active queue
    this.queue = this.queue.filter((op) => op.operationId !== operation.operationId);
    savePendingQueue(this.queue);

    // Append to dead letter log
    const dlItem: DeadLetterOperation = {
      operationId: operation.operationId,
      type: operation.type,
      payloadSummary: JSON.stringify(operation.payload || {}).substring(0, 200),
      failedAt: new Date().toISOString(),
      errorCode,
      errorMessage,
      retryCount: operation.retryCount
    };

    this.deadLetter.push(dlItem);
    if (this.deadLetter.length > 50) {
      this.deadLetter = this.deadLetter.slice(-50);
    }
    saveDeadLetterQueue(this.deadLetter);
    this.notify();
  }

  public getPendingCount(): number {
    return this.queue.length;
  }

  public getDeadLetterCount(): number {
    return this.deadLetter.length;
  }

  public getDeadLetterItems(): DeadLetterOperation[] {
    return [...this.deadLetter];
  }

  public clearQueue(): void {
    this.queue = [];
    savePendingQueue(this.queue);
    this.notify();
  }

  /**
   * Switches user context: reloads queue and metadata for the active user partition.
   */
  public switchUser(): void {
    this.meta = loadSyncMeta();
    this.queue = loadPendingQueue();
    this.deadLetter = loadDeadLetterQueue();
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in sync queue listener:', err);
      }
    });
  }
}

export const syncQueue = new SyncQueue();
