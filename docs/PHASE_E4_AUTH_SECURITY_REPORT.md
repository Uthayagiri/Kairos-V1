# KAIROS — PHASE E.4: AUTHENTICATION & SECURITY REPORT

**Status:** COMPLETE & VERIFIED  
**Date:** September 2026  
**Target Environment:** Local Backend Service (`http://localhost:5000`) & Offline-First Client Architecture  
**Previous Baseline:** Phase E.3 Backend Sync API  

---

## EXECUTIVE SUMMARY

Phase E.4 establishes the production-grade authentication and security perimeter for the Kairos backend service. It transitions the system from development placeholder context hooks to an authoritative, cryptographically sound identity model using **Argon2id** password hashing, **JWT Access Tokens (15-minute standard lifetime)**, and **Database-Persisted, Rotating Refresh Tokens (30-day lifetime)** with token hashing (SHA-256) and replay detection.

All protected API routes (including Sync batch ingestion) now enforce strict Bearer authentication. Client-supplied identities, rewards, and progression states are never trusted.

---

## 1. AUTHENTICATION ARCHITECTURE

```text
                               +----------------------------------+
                               |     Client (Web / Mobile)        |
                               +----------------------------------+
                                        |                |
                       (Auth / Refresh) |                | (Sync & Protected Requests)
                                        v                v
                       +--------------------------------------------------+
                       |              Fastify HTTP Server                 |
                       |  - Rate Limiting (@fastify/rate-limit)           |
                       |  - CORS Security Policy                          |
                       |  - Cookie Transport (@fastify/cookie)            |
                       +--------------------------------------------------+
                                        |                |
                          /auth Routes  |                | authContextHook (JWT Bearer)
                                        v                v
                       +-------------------+   +--------------------------+
                       |    AuthService    |   | Request Context          |
                       | - Argon2id Hash   |   | - Verified request.userId|
                       | - JWT Sign/Verify |   +--------------------------+
                       | - Refresh Rotate  |                 |
                       +-------------------+                 v
                                 |             +--------------------------+
                                 |             |  Domain Services (Sync,  |
                                 |             |  Progression, Tasks, etc)|
                                 v             +--------------------------+
                       +--------------------------------------------------+
                       |           PostgreSQL Database (Prisma)           |
                       |  - users (Argon2id password_hash, status)        |
                       |  - refresh_tokens (SHA-256 token_hash, rotation) |
                       |  - user_profiles, progression_states, etc.       |
                       +--------------------------------------------------+
```

---

## 2. DATABASE MODELS

### `User` Table Extension
Extended existing model in `backend/prisma/schema.prisma`:
* `id` (`UUID`): Primary key.
* `email` (`VARCHAR(255)`): Unique, normalized lowercase index.
* `passwordHash` (`VARCHAR(255)`): Argon2id password hash (`$argon2id$...`).
* `status` (`VARCHAR(50)`): Default `'active'` (supports account suspension/deactivation).
* `createdAt`, `updatedAt`, `deletedAt`: Timestamps with timezone.
* Relations: `refreshTokens RefreshToken[]`, `profile UserProfile?`, `progression ProgressionState?`, `tasks Task[]`, etc.

### `RefreshToken` Table
New persistence model for refresh token rotation and revocation:
```prisma
model RefreshToken {
  id                String    @id @default(uuid()) @db.Uuid
  userId            String    @map("user_id") @db.Uuid
  tokenHash         String    @map("token_hash") @db.VarChar(255)
  expiresAt         DateTime  @map("expires_at") @db.Timestamptz
  revokedAt         DateTime? @map("revoked_at") @db.Timestamptz
  replacedByTokenId String?   @map("replaced_by_token_id") @db.VarChar(64)
  createdAt         DateTime  @default(now()) @map("created_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([tokenHash])
  @@map("refresh_tokens")
}
```

---

## 3. PASSWORD HASHING (ARGON2ID)

Implemented in `backend/src/utils/security.utils.ts` and `backend/src/services/auth.service.ts`:
* **Algorithm**: Argon2id (`argon2.argon2id`)
* **Memory Cost**: 65,536 KB (64 MB)
* **Time Cost**: 3 iterations
* **Parallelism**: 4 threads
* **Security Invariants**:
  * Passwords are never stored plaintext.
  * Passwords are never logged or returned through any API response or error.
  * Passwords are checked using constant-time native comparison.
  * Minimum complexity: 8–128 characters, at least 1 alphabetic character and 1 numeric character.

---

## 4. TOKEN LIFECYCLE & ROTATION

### JWT Access Token
* **Format**: Standard signed JSON Web Token.
* **Algorithm**: HS256 with cryptographically secure secret (`JWT_ACCESS_SECRET`).
* **TTL**: 15 minutes (`15m`).
* **Payload**:
  ```json
  {
    "sub": "00000000-0000-4000-8000-000000000001",
    "type": "access",
    "iat": 1758645000,
    "exp": 1758645900
  }
  ```
* **No PII**: Zero sensitive metadata, PII, or credentials in payload.

### Refresh Token Rotation
* **Value**: Cryptographically secure 48-byte random string (`generateRandomRefreshToken()`).
* **Storage**: Database stores only SHA-256 hash (`hashRefreshToken()`).
* **TTL**: 30 days (`30d`).
* **Rotation Sequence**:
  1. Client sends raw refresh token to `POST /api/v1/auth/refresh`.
  2. Server hashes raw token and looks up `RefreshToken` record.
  3. **Replay Attack Detection**: If token is already revoked (`revokedAt !== null`), server immediately revokes **ALL** active refresh tokens for the user account and rejects with HTTP 401 (`REVOKED_TOKEN_REUSE`).
  4. If token is expired: server revokes token and rejects with HTTP 401 (`EXPIRED_REFRESH_TOKEN`).
  5. If valid: server revokes old token (`revokedAt = now()`, `replacedByTokenId = newToken.id`), creates new `RefreshToken` record, signs a new JWT Access Token, and returns both to the client.

---

## 5. API ENDPOINTS & CONTRACTS

Mounted under `/api/v1/auth`:

### 1. `POST /api/v1/auth/register`
* **Rate Limit**: 20 req/min
* **Request**:
  ```json
  {
    "email": "voyager@kairos.ai",
    "password": "SecurePassword123!",
    "name": "Kairos Voyager"
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "7f8b9a...",
    "tokenType": "Bearer",
    "expiresIn": "15m",
    "user": {
      "id": "a0000000-0000-4000-8000-000000000001",
      "email": "voyager@kairos.ai",
      "status": "active",
      "createdAt": "2026-09-23T16:00:00.000Z",
      "profile": { "id": "...", "name": "Kairos Voyager", ... },
      "progression": { "totalXp": 0, "level": 1, "todayHp": 0, ... }
    }
  }
  ```
* Sets `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth` cookie for refresh token.

### 2. `POST /api/v1/auth/login`
* **Rate Limit**: 20 req/min
* **Request**:
  ```json
  {
    "email": "voyager@kairos.ai",
    "password": "SecurePassword123!"
  }
  ```
* **Response (200 OK)**: Authenticated session object + tokens.

### 3. `POST /api/v1/auth/refresh`
* **Rate Limit**: 20 req/min
* **Request**: `{ "refreshToken": "..." }` or Cookie `refreshToken`
* **Response (200 OK)**: New Access Token + Rotated Refresh Token.

### 4. `POST /api/v1/auth/logout`
* **Request**: `{ "refreshToken": "..." }` or Cookie `refreshToken`
* **Response (200 OK)**: `{ "success": true, "message": "Logged out successfully." }`
* Clears refresh token cookie and marks token revoked in database.

### 5. `GET /api/v1/auth/me`
* **Protected**: Requires `Authorization: Bearer <access-token>`
* **Response (200 OK)**: Safe user profile and authoritative progression state.

---

## 6. MIDDLEWARE & AUTH CONTEXT

`backend/src/middleware/authContext.ts` completely replaces the Phase E.3 development placeholder:
1. Validates `Authorization: Bearer <token>`.
2. Verifies signature with `JWT_ACCESS_SECRET` and validates `type === 'access'` and `sub` claim UUID format.
3. Attaches `request.userId = payload.sub`.
4. Rejections:
   * Missing header -> HTTP 401 (`AUTH_HEADER_MISSING`)
   * Malformed format -> HTTP 401 (`AUTH_HEADER_MALFORMED`)
   * Invalid signature / malformed token -> HTTP 401 (`TOKEN_INVALID`)
   * Expired token -> HTTP 401 (`TOKEN_EXPIRED`)
5. **No spoofing**: Never accepts `x-user-id`, `x-kairos-user-id`, query params, or body parameters for identity.

---

## 7. USER ISOLATION & SYNC PROTECTION

* `POST /api/v1/sync/batch` is strictly protected by `authContextHook`.
* The server sync engine (`sync.service.ts`) executes all mutations for `request.userId`.
* Any client attempt to inject another user's ID inside operation payloads is ignored.

---

## 8. ENVIRONMENT CONFIGURATION

Updated `backend/.env.example` and `backend/src/config/env.ts`:
* `JWT_ACCESS_SECRET`: Minimum 32 characters in production. Fails startup if missing or default.
* `JWT_REFRESH_SECRET`: Minimum 32 characters in production. Fails startup if missing or default.
* `ACCESS_TOKEN_TTL`: Standard `15m`.
* `REFRESH_TOKEN_TTL`: Standard `30d`.
* `CORS_ORIGIN`: Explicit comma-separated origins. Fails startup in production if set to `*`.
* `RATE_LIMIT_MAX`: Default 100/min.
* `AUTH_RATE_LIMIT_MAX`: Default 20/min.

---

## 9. TEST SUITE VERIFICATION

All tests passing:

```text
Backend Test Execution:
  85/85 tests passed across 17 test suites (0 failed)
  - auth.test.ts (30 unit & integration tests)
  - sync.test.ts (24 batch sync & invariant tests)
  - progressionEngine.test.ts (11 math invariant tests)
  - dataModelLogic.test.ts (5 isolation & ledger tests)
  - validation.test.ts (6 schema tests)
  - health.test.ts (4 probe tests)
  - config.test.ts (2 environment tests)
  - error.test.ts (2 error handling tests)

Frontend & Regression Test Execution:
  - Frontend TypeScript (npx tsc --noEmit): 0 errors
  - Frontend Production Build (npm run build): PASS
  - Full Regression Suites (node --test tests/*.test.cjs): 17/17 PASS
```

---

## 10. PROTECTED INVARIANTS STATUS

1. **Progression Formula**: $L = \min(100, \lfloor\sqrt{XP/100}\rfloor + 1)$ — **PRESERVED**
2. **Daily HP Threshold**: $100 + \lfloor\text{level}/5\rfloor \times 15$ — **PRESERVED**
3. **Achievements**: Strictly XP rewards only; HP reward is strictly 0 — **PRESERVED**
4. **Squad Contributions**: Strictly 0 XP and 0 HP to personal user state — **PRESERVED**
5. **Offline Storage**: Local multi-user storage and isolation intact — **PRESERVED**
6. **UI / Styling**: Completely unchanged — **PRESERVED**

---

## 11. KNOWN LIMITATIONS & NEXT PHASES

* **Phase E.5 (Frontend Sync Manager & Offline Queue)**: Frontend network hook and background sync worker will consume `/api/v1/auth` and `/api/v1/sync` while keeping local offline storage active.
* **Phase E.6 (Conflict Resolution & Schema Migrations)**: Cloud PostgreSQL migrations and client drift recovery.
* **Phase E.7 (Cloudflare Tunnel & Zero Trust)**: Public secure routing without opening direct inbound ports.
