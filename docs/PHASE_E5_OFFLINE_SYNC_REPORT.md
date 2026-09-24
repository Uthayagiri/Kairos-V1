# Kairos Phase E.5 — Frontend API Client & Offline-First Sync Manager Report

## Executive Summary

Phase E.5 connects the Kairos frontend to the backend services (`http://localhost:5000` configurable via `VITE_API_BASE_URL`) while preserving 100% offline functionality. The frontend never blocks or becomes unusable when the backend is offline. Local mutations remain instant and optimistic, progression calculations remain mathematical and server-authoritative, and user data remains strictly isolated across partitioned storage domains.

---

## 1. Architecture Overview

```
                      +------------------------------------------+
                      |             Kairos Frontend              |
                      |   (Screens, Hooks, Progression Engine)   |
                      +------------------------------------------+
                                       |          |
                    (Optimistic Local) |          | (Enqueue Mutation)
                                       v          v
                  +-----------------------+   +-----------------------+
                  |  User-Scoped Storage  |   |   Offline Sync Queue  |
                  |  (Local Persistence)  |   |   (Monotonic Sequence)|
                  +-----------------------+   +-----------------------+
                                                          |
                                          (Reachability & Auth Verified)
                                                          |
                                                          v
                                              +-----------------------+
                                              |      Sync Manager     |
                                              | (Batch <= 100 / Mutex)|
                                              +-----------------------+
                                                          |
                                                          | POST /api/v1/sync/batch
                                                          v
                                              +-----------------------+
                                              |       API Client      |
                                              |  (In-Memory Bearer /  |
                                              |   401 Refresh Mutex)  |
                                              +-----------------------+
                                                          |
                                                          | (HTTP / TLS)
                                                          v
                                              +-----------------------+
                                              |     Kairos Backend    |
                                              |  (Phase E.1 - E.4)    |
                                              +-----------------------+
                                                          |
                                                          v
                                              +-----------------------+
                                              |  PostgreSQL Database  |
                                              +-----------------------+
```

---

## 2. Component Specifications

### 2.1 API Configuration (`src/features/api/config/apiConfig.ts`)
* **Environment Base URL**: Dynamic evaluation of `VITE_API_BASE_URL` with fallback to `http://localhost:5000`. Supports future Cloudflare Tunnels without code rebuilds.
* **Endpoint Catalog**: Centralized constant definitions for Health (`/health`), Sync Status (`/api/v1/sync/status`), Auth (`/api/v1/auth/*`), and Sync Batch (`/api/v1/sync/batch`).

### 2.2 API Client (`src/features/api/services/apiClient.ts`)
* **Typed Error Translation**: Converts HTTP status codes and transport errors into explicit error classes (`NetworkError`, `TimeoutError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `ValidationError`, `ServerError`).
* **In-Memory JWT Attachment**: Bearer tokens are attached dynamically from in-memory `authSession`.
* **Single-Flight 401 Refresh Mutex**: When multiple concurrent requests receive 401, exactly one refresh call (`POST /api/v1/auth/refresh`) is dispatched. Other requests await the shared promise and retry with the new token.
* **Bounded Retries**: A failed request is retried at most once after successful token rotation.

### 2.3 Authentication Session (`src/features/auth/`)
* **Strict In-Memory Storage**: Access tokens are stored strictly in memory (`authSession.ts`), never in `localStorage` or `sessionStorage`.
* **HttpOnly Cookie Compatibility**: Relies on secure cookies for refresh token rotation where supported.
* **Clean Session Teardown**: `authSession.clearSession()` clears in-memory credentials without touching other user partitions.

### 2.4 Connectivity Manager (`src/features/sync/services/connectivityManager.ts`)
* **Four-State Machine**: `ONLINE`, `OFFLINE`, `UNKNOWN`, `SYNCING`.
* **Reachability Verification**: Beyond `navigator.onLine`, actively checks backend reachability via `GET /api/v1/sync/status` with a 4-second timeout.
* **Event Subscriptions**: Reacts to window `online`/`offline` events and visibility changes.

### 2.5 Offline Sync Queue (`src/features/sync/syncQueue.ts`)
* **Stable UUID `operationId`**: Uses RFC 4122 v4 UUIDs generated at enqueue time; remains immutable across retries for idempotency.
* **Per-User Monotonic Sequence**: Tracks an integer sequence counter (`lastSequenceNumber`) per user partition.
* **Payload Sanitization**: Automatically strips passwords, password hashes, and auth tokens before enqueueing.
* **Batch Peeking**: Returns up to 100 pending operations sorted deterministically by sequence ascending.

### 2.6 Dead-Letter Queue (DLQ) (`src/features/sync/syncStorage.ts`)
* **Permanent Rejections**: Operations rejected with `VALIDATION_ERROR` or `INVALID_OPERATION` are immediately routed to `STORAGE_DOMAINS.SYNC_DEAD_LETTER`.
* **Bounding**: DLQ storage is capped at 50 items to prevent unbounded memory growth.
* **Zero Secret Logging**: Payload summaries never store authentication credentials.

### 2.7 Synchronization Manager (`src/features/sync/syncManager.ts`)
* **Single-Flight Concurrency Lock**: Guards against multiple simultaneous sync cycles.
* **Exponential Backoff**: Transient errors trigger retries with exponential backoff:
  $$\text{Delay} = \min(60000\text{ms}, 2^{\text{errors}} \times 1000\text{ms} + \text{jitter})$$
* **Partial Batch Resolution**: Successfully handles batches with mixed results (`APPLIED`, `ALREADY_APPLIED`, `REJECTED`).
* **Authoritative Server Snapshot Reconciliation**: Updates local `ProgressionState` with server-calculated `totalXp`, `level`, `todayHp`, and `lifetimeHp`.

---

## 3. Progression Invariants & Safety

1. **Non-Authoritative Client Payloads**: Client mutations for `TASK_COMPLETED` contain only `{ taskId, completionDate, taskHp }`. The client **never** submits `earnedXp`, `earnedHp`, `level`, or `totalXp`.
2. **Server-Side Math Authority**:
   $$L = \min(100, \lfloor\sqrt{\text{TotalXP} / 100}\rfloor + 1)$$
   $$\text{Daily Threshold} = 100 + 15 \times \lfloor(L - 1) / 5\rfloor$$
   $$\text{Pre-Cap Ratio} = 1.0\times, \quad \text{Post-Cap Ratio} = 0.01\times$$
3. **Achievement & Squad Zero-HP Invariants**:
   * Achievements award level-scaled XP with strictly $0\text{ HP}$.
   * Squad contributions award strictly $0\text{ XP}$ and $0\text{ HP}$ to individual progression.

---

## 4. Multi-User Isolation Matrix

| Storage Domain | Key Pattern | Multi-User Behavior |
| :--- | :--- | :--- |
| **Sync Queue** | `KAIROS_USER_<uid>_SYNC_QUEUE_V1` | Isolated per user. User A mutations never sent for User B. |
| **Dead-Letter Queue** | `KAIROS_USER_<uid>_SYNC_DEAD_LETTER_V1` | Isolated per user. DLQ items stored per account partition. |
| **Sync Metadata** | `KAIROS_USER_<uid>_SYNC_META_V1` | Isolated per user. Sequence counters increment independently. |
| **Progression State** | `KAIROS_USER_<uid>_PROGRESSION_STATE_V1` | Isolated per user. Optimistic state and snapshot reconciliation strictly scoped. |

---

## 5. Verification & Test Execution Results

### 5.1 Backend Test Suites (`backend/`)
* **Total Tests**: 85 passed, 0 failed (17 test suites)
* **TypeScript Compilation (`npm run typecheck`)**: 0 errors
* **Production Build (`npm run build`)**: Success

### 5.2 Frontend Root Test Suites (`tests/`)
* **Total Tests**: 42 passed, 0 failed (3 runner suites + 17 regression suites)
* **API Client Tests (`tests/apiClient.test.cjs`)**: 5 passed, 0 failed
* **Sync Queue Tests (`tests/syncQueue.test.cjs`)**: 10 passed, 0 failed
* **Sync Manager Tests (`tests/syncManager.test.cjs`)**: 10 passed, 0 failed
* **Root TypeScript Check (`npx tsc --noEmit`)**: 0 errors
* **Vite Production Bundle (`npm run build`)**: Built in 31.67s (0 errors)

---

## 6. Phase E.5 Completion Summary

```text
PHASE E.5 OFFLINE-FIRST SYNC COMPLETE

API Client:
PASS

Authentication Integration:
PASS

Connectivity Detection:
PASS

Offline Queue:
PASS

Idempotency:
PASS

Retry / Backoff:
PASS

Dead Letter:
PASS

Batch Sync:
PASS

Snapshot Reconciliation:
PASS

User Isolation:
PASS

Task Sync:
PASS

Achievement Sync:
PASS

Focus Sync:
PASS

Profile Sync:
PASS

Squad Sync:
PASS

Backend Tests:
85/85

Frontend Regression:
42/42

TypeScript:
PASS

Production Build:
PASS

Progression Invariants:
PRESERVED

XP/HP Rules:
PRESERVED

Offline Behavior:
PRESERVED

UI:
UNCHANGED

Documentation:
docs/PHASE_E5_OFFLINE_SYNC_REPORT.md
```
