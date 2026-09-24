# KAIROS PHASE E.2 — BACKEND DATA MODEL & SERVER AUTHORITY REPORT

> **Phase Status**: COMPLETE & VERIFIED  
> **Backend Stack**: Node.js v24.17.0 | TypeScript 5.6.3 | Fastify v5.2.1 | Prisma ORM v6.4.1 | PostgreSQL  
> **Verification**: 30/30 Backend Tests Passing (6 Suites) | 17/17 Frontend Regression Test Suites Passing | TypeScript 0 Errors | Production Build Passing  

---

## 1. Executive Summary

Phase E.2 establishes the comprehensive **PostgreSQL Data Model**, the **Anti-Duplication Ledger Architecture**, the **Server-Side Progression Engine**, and the modular **Domain Service Layer** for the Kairos Circadian Productivity Operating System.

### Key Architectural Accomplishments:
1. **Expanded Prisma Schema**: 12 relational models (`User`, `UserProfile`, `ProgressionState`, `Task`, `TaskCompletion`, `AchievementProgress`, `FocusSession`, `DailyReflection`, `Squad`, `SquadMember`, `SquadChallenge`, `Connection`, `SyncOperation`) with UUID primary keys, timestamps, indexes, and strict multi-user partitioning.
2. **Database-Enforced Anti-Duplication Ledger**: `unique_user_task_date` unique constraint on `(userId, taskId, completionDate)` and `unique_user_task_idempotency` on `(userId, idempotencyKey)` guarantees that duplicate task submissions, network retries, and multi-device sync attempts **never double-award XP or HP**.
3. **Server-Side Progression Engine**: Pure mathematical mirror of `KAIROS_PROGRESSION_SPEC.md` running on the backend. The server calculates all XP, HP, level advancements ($L = \min(100, \lfloor\sqrt{XP/100}\rfloor + 1)$), daily thresholds ($100 + \lfloor L/5 \rfloor \times 15$), fractional XP remainder accumulations, and consecutive daily streaks.
4. **Protected Progression Invariants**:
   - Achievements grant level-scaled XP only; **strictly 0 HP**.
   - Squad task contributions advance squad challenge goals; **strictly 0 XP and 0 HP** to personal user progression.
   - Client-provided XP or HP values are **never trusted** by the server.
5. **Zero Frontend Regressions**: All 17 existing frontend test suites pass, TypeScript compilation passes with 0 errors, and the production build builds cleanly.

---

## 2. Prisma Database Model Map & Relationships

```mermaid
erDiagram
    USERS ||--|| USER_PROFILES : has
    USERS ||--|| PROGRESSION_STATES : owns
    USERS ||--o{ TASKS : owns
    USERS ||--o{ TASK_COMPLETIONS : records
    USERS ||--o{ ACHIEVEMENT_PROGRESS : earns
    USERS ||--o{ FOCUS_SESSIONS : logs
    USERS ||--o{ DAILY_REFLECTIONS : writes
    USERS ||--o{ SQUAD_MEMBERS : joins
    USERS ||--o{ CONNECTIONS_INITIATED : sends
    USERS ||--o{ CONNECTIONS_RECEIVED : receives
    USERS ||--o{ SYNC_OPERATIONS : tracks

    SQUADS ||--o{ SQUAD_MEMBERS : contains
    SQUADS ||--o{ SQUAD_CHALLENGES : hosts

    USERS {
        uuid id PK
        varchar email UK
        varchar password_hash
        timestamptz created_at
        timestamptz deleted_at
    }
    PROGRESSION_STATES {
        uuid id PK
        uuid user_id FK, UK
        int total_xp
        double xp_remainder
        int level
        int today_hp
        int lifetime_hp
        int streak_count
        varchar last_active_date
        bigint version
    }
    TASK_COMPLETIONS {
        uuid id PK
        uuid user_id FK
        varchar task_id
        varchar completion_date
        double earned_xp
        int earned_hp
        varchar idempotency_key
    }
    ACHIEVEMENT_PROGRESS {
        uuid id PK
        uuid user_id FK
        varchar achievement_id
        int current_progress
        int target_progress
        boolean is_unlocked
        boolean reward_claimed
        int reward_xp_awarded
        int reward_hp_awarded
    }
    SQUADS {
        uuid id PK
        varchar name
        varchar handle UK
        varchar league_tier
        int total_xp
    }
```

### Table Specifications:

| Model | Table Name | Primary Key | Key Foreign Keys | Uniqueness Constraints | Primary Indexes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `User` | `users` | `id` (UUID) | None | `email` | `email` |
| `UserProfile` | `user_profiles` | `id` (UUID) | `userId` $\rightarrow$ `users.id` | `userId` | `userId` |
| `ProgressionState` | `progression_states` | `id` (UUID) | `userId` $\rightarrow$ `users.id` | `userId` | `userId` |
| `Task` | `tasks` | `id` (UUID) | `userId` $\rightarrow$ `users.id` | `(userId, taskId)` | `(userId, isActive)` |
| `TaskCompletion` | `task_completions` | `id` (UUID) | `userId` $\rightarrow$ `users.id` | `(userId, taskId, completionDate)`, `(userId, idempotencyKey)` | `(userId, completionDate)` |
| `AchievementProgress` | `achievement_progress` | `id` (UUID) | `userId` $\rightarrow$ `users.id` | `(userId, achievementId)` | `(userId, isUnlocked)` |
| `FocusSession` | `focus_sessions` | `id` (UUID) | `userId` $\rightarrow$ `users.id` | `(userId, sessionId)` | `(userId, completedAt)` |
| `DailyReflection` | `daily_reflections` | `id` (UUID) | `userId` $\rightarrow$ `users.id` | `(userId, date)` | `(userId, date)` |
| `Squad` | `squads` | `id` (UUID) | None | `handle` | `handle` |
| `SquadMember` | `squad_members` | `id` (UUID) | `squadId` $\rightarrow$ `squads.id`, `userId` $\rightarrow$ `users.id` | `(squadId, userId)` | `userId` |
| `SquadChallenge` | `squad_challenges` | `id` (UUID) | `squadId` $\rightarrow$ `squads.id` | None | `(squadId, isCompleted)` |
| `Connection` | `connections` | `id` (UUID) | `initiatorId` $\rightarrow$ `users.id`, `receiverId` $\rightarrow$ `users.id` | `(initiatorId, receiverId)` | `(receiverId, status)` |
| `SyncOperation` | `sync_operations` | `id` (UUID) | `userId` $\rightarrow$ `users.id` | `(userId, idempotencyKey)` | `(userId, entityType)` |

---

## 3. Anti-Duplication Ledger & Idempotency Architecture

### The Problem:
On intermittent mobile networks, a client may complete a task offline, gain +15 XP, and sync when connectivity returns. If the server response ACK drops due to packet loss, the client re-submits the completion during the next retry loop.

### Database-Level Mitigation:
1. **Calendar Date Constraint**:
   ```sql
   CONSTRAINT unique_user_task_date UNIQUE (user_id, task_id, completion_date)
   ```
   Ensures that a user can never record more than one completion for the same task on the same date.
2. **Idempotency Replay Constraint**:
   ```sql
   CONSTRAINT unique_user_task_idempotency UNIQUE (user_id, idempotency_key)
   ```
   Ensures that if an operation with the same client-generated UUID is re-sent, the server detects the existing record.
3. **Execution Flow in `ProgressionService`**:
   - Server checks if `(userId, taskId, completionDate)` or `(userId, idempotencyKey)` already exists in `TaskCompletion`.
   - If found: Returns `{ status: "ALREADY_PROCESSED", earnedXp: 0, earnedHp: 0, isDuplicate: true }`.
   - If new: Calculates rewards, records completion in ledger, and updates `ProgressionState` inside an ACID database transaction.

---

## 4. Server Authority vs. Client Responsibility Matrix

| Data Domain | Authority Level | Server Responsibility | Client Responsibility |
| :--- | :--- | :--- | :--- |
| **Lifetime XP & Level** | **SERVER AUTHORITATIVE** | Calculates cumulative XP, validates conversions, enforces 100-level lookup table. | Renders optimistic XP in UI; updates reactive state on server confirmation. |
| **Daily HP & Thresholds** | **SERVER AUTHORITATIVE** | Computes pre-cap (1.0x) and post-cap (0.01x) splits based on server level; enforces midnight resets. | Tracks daily progress ring; resets local daily widgets on midnight rollover. |
| **Daily Streaks** | **SERVER AUTHORITATIVE** | Traverses historical calendar completion records to calculate unbroken streak count. | Displays streak flame badge. |
| **Achievement Rewards** | **SERVER AUTHORITATIVE** | Determines level-scaled XP reward; strictly enforces 0 HP invariant; tracks claim state. | Plays 3D unlock animations and particle effects locally. |
| **Squad Challenge Progress** | **SERVER AUTHORITATIVE** | Atomically increments shared challenge counters; enforces 0 XP / 0 HP to personal user. | Displays squad leaderboard and challenge countdown timers. |
| **Tasks & Custom Schedules** | **HYBRID** | Persists custom tasks, circadian time windows, and soft deletions. | Executes offline task CRUD; schedules native OS alarms and push notifications. |
| **Focus Sessions** | **HYBRID** | Persists completed session log, flow score, and ratings as immutable event stream. | Executes high-precision stopwatch countdown timer and ambient sound synthesis. |
| **Reflections & Bio** | **HYBRID** | Stores daily journal reflections and profile customization fields. | Formats local input forms and renders markdown notes. |
| **Transient UI / WebGL** | **CLIENT ONLY** | *None* | Three.js canvas buffers, particle emitters, modal sheets, and active screen routes. |

---

## 5. Backend Service Layer Architecture

The service layer is organized into focused, modular domains in `backend/src/services/`:

1. **`progressionEngine.service.ts`**: Pure mathematical calculations for the 100-level progression curve:
   - `getDeltaXPForLevel(level)`: $\Delta XP(L) = \text{round}_5(80 + 45(L-1) + 2.40(L-1)^{1.95})$
   - `calculateDailyHpThreshold(level)`: $100 + \lfloor \text{level}/5 \rfloor \times 15$
   - `calculateReward(level, todayHp, taskHp)`: Pre-cap $1.0\times$, post-cap $0.01\times$.
   - `addExperience(totalXp, remainder, earnedXp)`: Fractional accumulator preservation.
   - `calculateAchievementXpReward(rarity, level)`: Level-scaled XP (5% to 25% of $\Delta XP$).
   - `calculateCurrentStreak(history, todayDateStr)`: Unbroken consecutive calendar day traversal.
2. **`progression.service.ts`**: High-level transaction coordinator for task completions, anti-duplication verification, daily rollovers, and achievement reward claims.
3. **`user.service.ts`**: User lifecycle management with automatic profile and progression state creation.
4. **`profile.service.ts`**: User profile retrieval and upsertion.
5. **`task.service.ts`**: Custom task management and completion dispatching.
6. **`achievement.service.ts`**: Progress tracking and reward claims.
7. **`focus.service.ts`**: Focus session recording and history retrieval.
8. **`squad.service.ts`**: Squad creation, membership, and challenge contributions (with 0 XP / 0 HP invariant enforcement).
9. **`sync.service.ts`**: General idempotency ledger and sync mutation logging.
10. **`validators/schemas.ts`**: Zod domain validation schemas enforcing strict UUIDs, dates, and non-negative bounds.

---

## 6. Verification & Test Results

### 1. Backend Verification (`backend/`):
- **Prisma Schema Generation (`npm run prisma:generate`)**: PASS (Prisma Client v6.19.3 generated with 12 models)
- **TypeScript Typecheck (`npm run typecheck`)**: PASS (0 errors)
- **Backend Build (`npm run build`)**: PASS (`tsc` compiled to `dist/`)
- **Backend Test Suite (`npm test`)**: **30 / 30 PASSING (6 test suites)**:
  - `tests/progressionEngine.test.ts` (11 tests):
    - Level 1 starts at 0 XP with 100 HP threshold (PASS)
    - Thresholds increase +15 HP every 5 levels (PASS)
    - 100-level cumulative XP table reaches 867,415 XP at Level 100 (PASS)
    - Pre-cap HP converts at 1.0x rate (PASS)
    - Post-cap HP converts at 0.01x rate (100 HP = 1 XP) (PASS)
    - Task crossing threshold splits pre-cap and post-cap (PASS)
    - Fractional XP remainder preserved in [0.0, 1.0) (PASS)
    - Achievement rewards grant level-scaled XP with strictly 0 HP (PASS)
    - Streak calculation evaluates consecutive calendar dates (PASS)
    - Streak maintains ongoing yesterday count (PASS)
    - Streak breaks on skipped days (PASS)
  - `tests/dataModelLogic.test.ts` (5 tests):
    - First task completion awards full XP and HP (PASS)
    - Duplicate completion on same date rejected without double XP/HP (PASS)
    - Idempotency key replay acknowledged safely without double crediting (PASS)
    - Multi-user isolation: User A and User B complete same task without collision (PASS)
    - Squad contribution invariant: strictly awards 0 personal XP and 0 personal HP (PASS)
  - `tests/validation.test.ts` (6 tests):
    - UUID validation and rejection of malformed strings (PASS)
    - Date format validation (YYYY-MM-DD) (PASS)
    - Email and password validation (PASS)
    - Task HP bounds validation (rejection of negative, 0, and >400 HP) (PASS)
    - Achievement rarity validation (PASS)
    - Squad handle constraints (PASS)
  - `tests/health.test.ts` (4 tests):
    - Server initialization (PASS)
    - `GET /health` 200 with `status: "ok"` (PASS)
    - `GET /api/v1/health` 200 with `status: "ok"` (PASS)
    - `GET /` root service info (PASS)
  - `tests/error.test.ts` (2 tests):
    - Unknown route returns structured 404 JSON (PASS)
    - Unknown API v1 route returns structured 404 JSON (PASS)
  - `tests/config.test.ts` (2 tests):
    - Environment defaults validation (PASS)
    - Database URL formatting (PASS)

### 2. Frontend Regression Verification (`e:\Kairos`):
- **Frontend TypeScript (`npx tsc --noEmit`)**: PASS (0 errors)
- **Frontend Production Build (`npm run build`)**: PASS (Vite transformed 846 modules in 18.01s)
- **Existing Regression Test Suites (`node --test tests/*.test.cjs`)**: **17 / 17 SUITES PASSING (100%)**

---

## 7. Migration & Local Database Instructions

### Connecting to Local PostgreSQL:
1. Ensure PostgreSQL is installed and running on `localhost:5432`.
2. Create database:
   ```sql
   CREATE DATABASE kairos_db;
   ```
3. Set connection string in `backend/.env`:
   ```env
   DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/kairos_db?schema=public"
   ```
4. Run Prisma Migration:
   ```bash
   cd backend
   npm run prisma:migrate
   ```
   *Prisma will create all 12 tables, indexes, and unique constraints automatically.*

---

## 8. Next Phase (Phase E.3)

In Phase E.3, we will implement the **Batch Sync Ingestion Engine (`POST /api/v1/sync/batch`)**:
- Atomic transaction processing for batches of operations.
- Server delta generation and reconciliation responses.
- Idempotent execution mapping against the anti-duplication ledger.
