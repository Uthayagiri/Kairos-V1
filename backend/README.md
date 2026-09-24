# Kairos Backend Service

Offline-first synchronization and multi-user backend foundation for the Kairos Circadian Productivity Operating System.

## Stack

- **Runtime**: Node.js v20+ / v22+ / v24+
- **Framework**: [Fastify](https://fastify.dev/) (High performance, schema-driven, native TypeScript)
- **Database & ORM**: PostgreSQL via [Prisma ORM](https://www.prisma.io/)
- **Configuration**: Zod validation + dotenv
- **Testing**: Node.js Test Runner with `tsx`

---

## Directory Structure

```
backend/
├── src/
│   ├── app.ts                 # Fastify app factory & middleware setup
│   ├── server.ts              # Server startup & graceful shutdown
│   ├── config/
│   │   └── env.ts             # Centralized environment validation
│   ├── db/
│   │   └── prisma.ts          # Reusable PrismaClient instance
│   ├── middleware/
│   │   └── errorHandler.ts    # Centralized JSON error & 404 handlers
│   ├── routes/
│   │   ├── index.ts           # Root & API v1 route registrar
│   │   └── health.routes.ts   # /health and /api/v1/health endpoints
│   └── services/
│       └── db.service.ts      # Database lifecycle & health checks
├── prisma/
│   └── schema.prisma          # PostgreSQL foundation schema
├── tests/
│   ├── health.test.ts         # Health endpoint test suite
│   ├── error.test.ts          # 404 & error response test suite
│   └── config.test.ts         # Environment configuration test suite
├── .env.example               # Environment variables template
├── package.json
└── tsconfig.json
```

---

## Local Setup & Development

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Generate Prisma Client

```bash
npm run prisma:generate
```

### 3. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set `DATABASE_URL` to your local PostgreSQL instance:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kairos_db?schema=public"
PORT=5000
NODE_ENV=development
```

### 4. Run Database Migrations (When PostgreSQL is running)

```bash
npm run prisma:migrate
```

### 5. Start Development Server

```bash
npm run dev
```

The server will start at `http://localhost:5000`.

---

## Available Scripts

- `npm run dev`: Starts the development server with live reload (`tsx watch`).
- `npm run build`: Compiles TypeScript to `dist/`.
- `npm run start`: Runs compiled server from `dist/server.js`.
- `npm run typecheck`: Runs TypeScript type checking (`tsc --noEmit`).
- `npm test`: Runs backend test suite.
- `npm run prisma:generate`: Regenerates Prisma Client.
- `npm run prisma:migrate`: Applies dev migrations.

---

## API Endpoints

### Health & Connectivity
- `GET /health`: Root health check (lightweight liveness probe).
- `GET /api/v1/health`: API v1 health probe.
- `GET /api/v1/sync/status`: Sync reachability probe for online/offline detection.

### Authentication & Sessions (Phase E.4)
- `POST /api/v1/auth/register`: Register new user (Argon2id hashing, creates profile and progression).
- `POST /api/v1/auth/login`: Authenticate with email/password (returns Access Token + Refresh Token).
- `POST /api/v1/auth/refresh`: Refresh token rotation (issues new Access Token + rotates Refresh Token).
- `POST /api/v1/auth/logout`: Revoke active refresh session.
- `GET /api/v1/auth/me`: Get current authenticated user profile (Requires `Authorization: Bearer <token>`).

### Synchronization (Phase E.3/E.4)
- `POST /api/v1/sync/batch`: Batch sync ingestion endpoint (Requires `Authorization: Bearer <token>`).

### Batch Sync Request Example:

```bash
curl -X POST http://localhost:5000/api/v1/sync/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-access-token>" \
  -d '{
    "deviceId": "device-mobile-001",
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
  }'
```


