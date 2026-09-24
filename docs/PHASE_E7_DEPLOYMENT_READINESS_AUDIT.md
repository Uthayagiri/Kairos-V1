# Kairos Phase E.7 — Deployment Readiness & Real-World Connectivity Audit

## 1. Executive Summary

This read-only audit reviews the complete Kairos frontend and backend repository for production deployment readiness under the target architecture:
* **Public Frontend**: Hosted on a static hosting platform (e.g. Vercel, Netlify, Cloudflare Pages, GitHub Pages).
* **Local Backend**: Hosted locally on the user's PC (`http://localhost:5000`).
* **Secure Internet Bridge**: Cloudflare Tunnel (`cloudflared`) exposing `localhost:5000` via public HTTPS without router port forwarding.
* **Database**: PostgreSQL persistence managed by Prisma ORM.
* **Offline-First Resilience**: Local mutations persist and queue in user-scoped storage during backend/tunnel downtime and automatically synchronize upon reachability.

---

## 2. Architecture Target

```
   [ PUBLIC INTERNET ]
   ========================================================================
   Public User Devices (Mobile / Web)
          |
          | HTTPS (Static SPA / PWA)
          v
   +-------------------------------------------------------------+
   |   Public Static Host (e.g. Cloudflare Pages / Vercel)       |
   |   - Bundled Vite Single-Page Application (HTML/CSS/JS)      |
   |   - VITE_API_BASE_URL=https://api.yourdomain.com            |
   +-------------------------------------------------------------+
          |
          | HTTPS Requests (Authorization Bearer in Memory)
          v
   +-------------------------------------------------------------+
   |   Cloudflare Edge Network (Zero-Trust Tunnel)               |
   |   - Terminates TLS (Valid HTTPS Certificate)                |
   |   - Forwards encrypted traffic to local cloudflared agent   |
   +-------------------------------------------------------------+
          |
          | Outbound Tunnel Protocol (No Router Port Forwarding Required)
          v
   ========================================================================
   [ LOCAL HOST MACHINE (User PC) ]
   +-------------------------------------------------------------+
   |   cloudflared daemon (Local Tunnel Client)                  |
   |   - Routes https://api.yourdomain.com -> localhost:5000     |
   +-------------------------------------------------------------+
          |
          | HTTP (Local Loopback)
          v
   +-------------------------------------------------------------+
   |   Kairos Backend (Fastify :5000)                            |
   |   - Strict CORS (Permits only deployed frontend origin)     |
   |   - Rate Limiter (IP / User throttling)                     |
   |   - Strict Server-Authoritative Progression Engine          |
   |   - JWT Auth & Rotating Refresh Token Family                |
   +-------------------------------------------------------------+
          |
          | TCP Connection
          v
   +-------------------------------------------------------------+
   |   PostgreSQL Database (Localhost:5432 / Container)          |
   |   - 14 Normalized Relational Tables via Prisma ORM          |
   +-------------------------------------------------------------+
```

---

## 3. Detailed Audit Findings (Items A through N)

### A. Whether PostgreSQL is actually required at runtime
* **Backend**: **YES** for permanent persistence and multi-device synchronization. The backend queries PostgreSQL for user authentication, progression states, and idempotency checks. `dbService.connect()` defers connection if PostgreSQL is temporarily offline at boot.
* **Frontend**: **NO**. The frontend is fully offline-first. When PostgreSQL or the backend is offline, the frontend operates against user-scoped localStorage and enqueues operations in the pending sync queue.

### B. Whether Prisma migrations exist
* **Finding**: `backend/prisma/schema.prisma` is fully defined and validated with 14 models. However, physical SQL migration files under `backend/prisma/migrations/` have not yet been generated on disk because migrations require an active database connection.
* **Action Required**: Running `npx prisma migrate dev --name init` or `npx prisma db push` once PostgreSQL is initialized.

### C. Whether database initialization is production-ready
* **Finding**: `dbService.ts` implements connection pooling, a lightweight health probe (`SELECT 1`), and signal listeners (`SIGINT`, `SIGTERM`) for graceful teardown. Database connectivity is production-ready.

### D. Whether CORS is correctly configurable
* **Finding**: `CORS_ORIGIN` in `backend/src/config/env.ts` is parsed from environment variables.
* **Production Rule**: In `production` mode, `env.ts` strictly rejects wildcard (`*`) origins. For deployment, `CORS_ORIGIN` must be set to the exact domain of the public static frontend (e.g. `CORS_ORIGIN="https://kairos-app.vercel.app"`).

### E. Whether JWT secrets are production-safe
* **Finding**: In development/test mode, fallback development secrets are permitted. In `production` mode (`NODE_ENV=production`), `env.ts` enforces that `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must be set, cannot equal development defaults, and must each be at least 32 cryptographically secure characters.

### F. Whether refresh-token behavior is safe for a public deployment
* **Finding**: Refresh tokens are high-entropy hex strings hashed with SHA-256 before storage in PostgreSQL (`token_hash`). Plaintext tokens are never stored. Token family rotation detects reuse and revokes compromised sessions immediately.

### G. Whether frontend API URL can be configured at build time
* **Finding**: `src/features/api/config/apiConfig.ts` dynamically evaluates `VITE_API_BASE_URL` from Vite's `import.meta.env`. During static build (`npm run build`), setting `VITE_API_BASE_URL=https://api.yourdomain.com` embeds the tunnel URL into the static bundle.

### H. Whether localhost fallback can accidentally remain in production
* **Finding**: If `VITE_API_BASE_URL` is omitted, `apiConfig.ts` falls back to `http://localhost:5000`. If deployed to a public HTTPS origin without this variable, modern browsers will block requests due to Mixed Content or unreachable local endpoints.
* **Mitigation**: Add clear deployment documentation and a production warning if `VITE_API_BASE_URL` is unset when built for production.

### I. Whether HTTP/HTTPS mixed-content problems can occur
* **Finding**: If the public frontend is accessed over HTTPS (e.g. `https://kairos-app.pages.dev`), the backend endpoint MUST also use HTTPS (provided natively by Cloudflare Tunnel). If an HTTP backend URL were used, browsers would block API calls as mixed active content. Cloudflare Tunnel eliminates this by providing an automatic HTTPS endpoint.

### J. Whether Cloudflare Tunnel can expose the backend without router port forwarding
* **Finding**: **YES**. `cloudflared` initiates outbound TLS tunnels to Cloudflare. Inbound requests to the public tunnel hostname are routed down the established tunnel to local port 5000. No firewall port forwarding or public static IP is needed.

### K. Whether offline mode still works if the backend URL is unreachable
* **Finding**: **YES**. `connectivityManager.ts` probes `/api/v1/sync/status` with a 4s timeout. When unreachable, state transitions to `OFFLINE`. The frontend uses local user-scoped storage, and all mutations enter the local sync queue.

### L. Whether sync retry behavior can survive backend shutdown/restart
* **Finding**: **YES**. Sync queues are persisted in `localStorage` (`KAIROS_USER_<uid>_SYNC_QUEUE_V1`). When the backend returns, `connectivityManager` detects reachability and dispatches `syncNow()`, which drains the queue with exponential backoff and jitter (max 60s).

### M. Whether multiple users are isolated
* **Finding**: **YES**.
  * Frontend: Storage keys are isolated by normalized user ID (`KAIROS_USER_<uid>_<domain>`).
  * Backend: Every API route strictly filters queries by `req.user.userId` from the verified JWT.

### N. Whether two devices using the same account can synchronize safely
* **Finding**: **YES**.
  * Device IDs (`deviceId`) distinguish clients.
  * Every mutation has a stable UUID `operationId`.
  * The backend applies operations idempotently, records completion dates in `task_completions`, and returns authoritative snapshots (`totalXp`, `level`, `todayHp`) that both devices reconcile cleanly.

---

## 4. Current Test Baseline Execution

All test suites and production builds were verified in this audit turn:

| Suite | Status | Metrics |
| :--- | :--- | :--- |
| **Backend Tests (`backend/npm test`)** | **PASS** | 85/85 tests passed across 17 suites (8.01s) |
| **Backend Typecheck (`backend/npm run typecheck`)** | **PASS** | 0 TypeScript errors |
| **Backend Build (`backend/npm run build`)** | **PASS** | `tsc` compilation success |
| **Frontend Tests (`node --test tests/*.test.cjs`)** | **PASS** | 53/53 tests passed across 4 runner suites + 17 regression suites |
| **Frontend Typecheck (`npx tsc --noEmit`)** | **PASS** | 0 TypeScript errors |
| **Frontend Production Build (`npm run build`)** | **PASS** | Built in 16.57s (0 errors) |

---

## 5. Deployment Blockers & Prerequisites

### Non-Blockers (Architecture is Healthy):
1. **Progression Invariants**: Server-authoritative math and formulas are fully preserved.
2. **Security & Tokens**: In-memory access tokens and rotating refresh tokens are secure.
3. **Offline Queueing**: All 10 domain mutations are wired to user-scoped storage.

### Actionable Prerequisites for Real Deployment:
1. **Database Migration Script**: Provide clear documentation and command (`npx prisma migrate dev` / `npx prisma db push`) to initialize tables on a fresh PostgreSQL instance.
2. **Production Environment Templates**:
   * `backend/.env.production.example` detailing secure secrets and frontend CORS origin.
   * `.env.production.example` for the frontend build.
3. **Cloudflare Tunnel Configuration Template**: Example `config.yml` for `cloudflared`.
4. **Local Production Test Script**: Step-by-step verification runbook.

---

## 6. Recommended Deployment Sequence

1. **Step 1: Local PostgreSQL Setup**: Start PostgreSQL service and apply schema via `npm run prisma:generate` and `npx prisma db push`.
2. **Step 2: Start Local Backend**: Configure `.env` with production JWT secrets, start `npm run build && npm run start`.
3. **Step 3: Start Cloudflare Tunnel**: Launch `cloudflared tunnel run <tunnel-name>` forwarding public HTTPS to `http://localhost:5000`.
4. **Step 4: Build & Deploy Frontend**: Set `VITE_API_BASE_URL=https://<your-tunnel-hostname>`, run `npm run build`, and deploy `dist/` to a static host (Vercel / Cloudflare Pages / Netlify).
5. **Step 5: Verify Connectivity**: Open the public frontend, register an account, and confirm real-time synchronization and offline fallback.
