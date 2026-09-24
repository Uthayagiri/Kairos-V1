# KAIROS PHASE E.3 — BACKEND SYNC API REPORT

> **Phase Status**: COMPLETE & VERIFIED  
> **Backend Stack**: Node.js v24.17.0 | TypeScript 5.6.3 | Fastify v5.2.1 | Prisma ORM v6.4.1 | PostgreSQL  
> **Verification**: 50/50 Backend Tests Passing (7 Suites) | 17/17 Frontend Regression Test Suites Passing | TypeScript 0 Errors | Production Build Passing  

---

## 1. Executive Summary

Phase E.3 establishes the **Backend Sync API** for the Kairos Circadian Productivity Operating System. 

It provides a versioned, atomic, and idempotent batch ingestion pipeline (`POST /api/v1/sync/batch`) and a lightweight connectivity health probe (`GET /api/v1/sync/status`). The system guarantees that mutations created by offline clients can be replayed, deduplicated, and resolved against server authority without any risk of duplicate XP or HP awards.

The existing frontend (Phases A–D) remains 100% offline-first and untouched.

---

## 2. API Endpoints & Request / Response Contracts

### A. Batch Synchronization (`POST /api/v1/sync/batch`)

- **Authentication**: `x-kairos-user-id` header (Development/Testing context; full JWT in Phase E.4).
- **Max Batch Size**: 100 operations.
- **Request Contract**:
  ```json
  {
    "deviceId": "device-mobile-001",
    "sinceVersion": 1,
    "operations": [
      {
        "operationId": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
        "sequence": 1,
        "type": "TASK_COMPLETED",
        "occurredAt": "2026-09-23T16:00:00.000Z",
        "payload": {
          "taskId": "sys-hydration-am",
          "completionDate": "2026-09-23",
          "taskHp": 15
        }
      }
    ]
  }
  ```

- **Response Contract**:
  ```json
  {
    "success": true,
    "serverTime": "2026-09-23T16:30:00.000Z",
    "cursorVersion": 2,
    "results": [
      {
        "operationId": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
        "status": "APPLIED",
        "code": "OK"
      }
    ],
    "snapshots": {
      "progression": {
        "totalXp": 15,
        "xpRemainder": 0.0,
        "level": 1,
        "todayHp": 15,
        "lifetimeHp": 15,
        "streakCount": 1,
        "lastActiveDate": "2026-09-23"
      },
      "tasks": null,
      "achievements": null
    }
  }
  ```

### B. Sync Connectivity Status (`GET /api/v1/sync/status`)

- **Purpose**: Fast reachability probe for online/offline detection (does not mutate database).
- **Response**:
  ```json
  {
    "online": true,
    "serverTime": "2026-09-23T16:30:00.000Z",
    "apiVersion": "v1"
  }
  ```

---

## 3. Supported Operation Types

| Operation Type | Target Domain | Payload Schema | Server Action & Invariant |
| :--- | :--- | :--- | :--- |
| `TASK_CREATED` | Tasks | `{ taskId, title, category, targetHp, startTime, endTime, durationMinutes, isCustom }` | Persists custom task definition in `tasks` table. |
| `TASK_UPDATED` | Tasks | `{ taskId, title, category, targetHp, startTime, endTime, durationMinutes }` | Field-level LWW update against `tasks` table. |
| `TASK_DELETED` | Tasks | `{ taskId }` | Soft-deletes task (`is_active = false`, `deleted_at = now()`). |
| `TASK_COMPLETED` | Progression | `{ taskId, completionDate, taskHp }` | **Server calculates XP & HP**. Anti-duplication enforced by `(userId, taskId, completionDate)`. Client XP/HP ignored! |
| `TASK_UNCOMPLETED` | Progression | `{ taskId, completionDate }` | Reverts completion record in `task_completions`. |
| `ACHIEVEMENT_CLAIMED`| Achievements | `{ achievementId, rarity }` | Awards level-scaled XP; **strictly 0 HP**. Idempotent claim. |
| `FOCUS_SESSION_RECORDED`| Focus | `{ sessionId, title, category, durationSeconds, targetDurationMinutes, startedAt, completedAt, flowScore, rating, notes, interrupted }` | Appends immutable focus record to `focus_sessions`. |
| `DAILY_REFLECTION_UPSERTED`| Reflections | `{ date, mood, energyScore, focusRating, wins, journalText }` | Upserts date-keyed reflection in `daily_reflections`. |
| `PROFILE_UPDATED` | Profile | `{ name, handle, bio, quote, timezone, circadianType, avatarUrl, bannerTheme }` | Updates user profile in `user_profiles`. |
| `SQUAD_CHALLENGE_CONTRIBUTION`| Squad | `{ squadId, challengeId, taskId }` | Increments squad challenge; **strictly 0 XP & 0 HP** to user. |

---

## 4. Idempotency & Conflict Resolution Architecture

### A. Idempotency & Safe Replays:
1. When an `operationId` is submitted:
   - Sync service queries `SyncOperation` and domain-specific ledgers (`task_completions`).
   - If previously processed: returns `{ operationId, status: "ALREADY_APPLIED", code: "ALREADY_PROCESSED" }`.
   - **Zero additional XP, HP, or duplicate database records are created**.
2. Replaying identical task completions 5 times results in the exact same single XP award.

### B. Conflict Rules:
- **Progression**: Server-authoritative. Lifetime XP is monotonically non-decreasing. Daily HP is calculated via the daily threshold split ($100 + \lfloor L/5 \rfloor \times 15$).
- **Task Completion**: Terminal True boolean state.
- **Custom Tasks / Profile**: Field-level Last-Write-Wins based on client `occurredAt` vs server `updatedAt`. If client update is stale, returns `status: "CONFLICT"`.

### C. Partial Batch Resilience:
- Operations in a batch are processed in sequence.
- An invalid or rejected operation (e.g. malformed payload in operation #2) **does not cause operation #1 or #3 to fail**. Each operation receives its own explicit result code (`APPLIED`, `ALREADY_APPLIED`, `REJECTED`, `CONFLICT`).

---

## 5. Security & Domain Validation Rules

### A. Non-Authoritative Client Payloads:
- The server **never trusts client-supplied XP, HP, level, or achievement reward values**.
- If a client attempts to pass `{ earnedXp: 999999, totalXp: 999999 }`, the server discards those fields and computes authoritative rewards using `progressionEngine.service.ts`.

### B. Request Boundaries:
- `MAX_OPERATIONS_PER_BATCH = 100` (oversized batches rejected with HTTP 400).
- Empty batches (`operations.length === 0`) rejected with HTTP 400.
- All UUIDs, timestamps (ISO 8601), and dates (YYYY-MM-DD) are strictly validated via Zod.

### C. Authentication Context Placeholder:
- In Phase E.3, `authContextHook` extracts `x-kairos-user-id` header (UUID validated).
- In development/test mode, defaults to `00000000-0000-4000-8000-000000000001` if omitted.
- In production mode, requests without valid credentials return HTTP 401 Unauthorized.
- Phase E.4 will introduce full JWT & Refresh Token authentication.

---

## 6. Verification & Test Results

### 1. Backend Test Suite (`backend/`):
- **Command**: `npm test`
- **Result**: **50 / 50 Tests Passing across 7 Test Suites (100%)**
  - `tests/sync.test.ts` (20 assertions):
    - `GET /api/v1/sync/status` reachability probe (PASS)
    - ISO server timestamp verification (PASS)
    - Empty batch 400 rejection (PASS)
    - Batch size >100 400 rejection (PASS)
    - Non-UUID operation ID 400 rejection (PASS)
    - Negative/non-integer sequence 400 rejection (PASS)
    - Malformed timestamp 400 rejection (PASS)
    - Unknown operation type 400 rejection (PASS)
    - Malformed request / missing deviceId 400 rejection (PASS)
    - Single valid operation execution (PASS)
    - Multiple ordered operations execution (PASS)
    - Duplicate operationId `ALREADY_APPLIED` replay (PASS)
    - Duplicate task completion on same date `ALREADY_APPLIED` (PASS)
    - 5x replay zero XP duplication verification (PASS)
    - 5x replay zero HP duplication verification (PASS)
    - Client XP spoofing ignored (PASS)
    - User isolation across sync batches (PASS)
    - Partial batch success (PASS)
    - Authoritative progression snapshot delivery (PASS)
    - Authoritative task snapshot delivery (PASS)
  - `tests/progressionEngine.test.ts` (11 tests): PASS
  - `tests/dataModelLogic.test.ts` (5 tests): PASS
  - `tests/validation.test.ts` (6 tests): PASS
  - `tests/health.test.ts` (4 tests): PASS
  - `tests/error.test.ts` (2 tests): PASS
  - `tests/config.test.ts` (2 tests): PASS

### 2. Frontend Regression Suite (`e:\Kairos`):
- **TypeScript (`npx tsc --noEmit`)**: PASS (0 errors)
- **Production Build (`npm run build`)**: PASS (Vite transformed 846 modules in 19.98s)
- **Existing Regression Test Suites (`node --test tests/*.test.cjs`)**: **17 / 17 SUITES PASSING (100%)**

---

## 7. Next Phase: Phase E.4 (Authentication & Security)

In Phase E.4, we will implement the **Production Authentication System**:
- Argon2id password hashing for registration & login.
- Short-lived Access JWTs (15 min) and rotating Refresh Tokens (30 days).
- Secure token storage contracts.
- Transitioning `authContextHook` from development placeholder to production JWT verification.
