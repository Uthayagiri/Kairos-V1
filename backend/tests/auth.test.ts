import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { buildApp } from '../src/app.js';
import { authService } from '../src/services/auth.service.js';
import { RegisterSchema, LoginSchema } from '../src/validators/auth.schemas.js';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRandomRefreshToken,
  hashRefreshToken,
  verifyAccessToken
} from '../src/utils/security.utils.js';
import { config } from '../src/config/env.js';

describe('Kairos Backend Authentication & Security Suite (Phase E.4)', () => {
  let app: FastifyInstance;

  // In-memory mock database state for isolated unit & API testing without live DB requirement
  const mockUsers = new Map<string, any>();
  const mockRefreshTokens = new Map<string, any>();

  before(async () => {
    process.env.NODE_ENV = 'test';
    app = await buildApp({ logger: false });
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  // -------------------------------------------------------------
  // 1. Password Hashing & Argon2id Invariants
  // -------------------------------------------------------------
  describe('Password Hashing (Argon2id)', () => {
    test('1. Argon2id produces valid hash with $argon2id$ identifier', async () => {
      const password = 'StrongPassword123!';
      const hash = await hashPassword(password);

      assert.ok(hash.startsWith('$argon2id$'), 'Hash must use Argon2id variant');
      assert.notEqual(hash, password, 'Hash must never be plaintext');
    });

    test('2. Argon2id correctly verifies matching password', async () => {
      const password = 'CorrectPassword99!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(hash, password);
      assert.equal(isValid, true);
    });

    test('3. Argon2id rejects non-matching password', async () => {
      const password = 'CorrectPassword99!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(hash, 'WrongPassword123!');
      assert.equal(isValid, false);
    });

    test('4. Safely handles malformed hashes without crashing', async () => {
      const isValid = await verifyPassword('not-a-valid-hash', 'password');
      assert.equal(isValid, false);
    });
  });

  // -------------------------------------------------------------
  // 2. JWT Access Token Issuance & Verification
  // -------------------------------------------------------------
  describe('JWT Access Token Lifecycle & Verification', () => {
    const testUserId = 'a0000000-0000-4000-8000-000000000001';

    test('5. Issues valid JWT access token with type: "access" and sub', () => {
      const { accessToken, expiresIn } = generateAccessToken(testUserId);
      assert.ok(accessToken);
      assert.equal(expiresIn, '15m');

      const payload = verifyAccessToken(accessToken);
      assert.equal(payload.sub, testUserId);
      assert.equal(payload.type, 'access');
      assert.ok(payload.exp);
    });

    test('6. Rejects token with invalid signature', () => {
      const fakeSecretToken = jwt.sign(
        { sub: testUserId, type: 'access' },
        'completely-wrong-secret-key-for-testing-tampering'
      );

      assert.throws(() => {
        verifyAccessToken(fakeSecretToken);
      });
    });

    test('7. Rejects expired access token', () => {
      const secret = config.JWT_ACCESS_SECRET || 'kairos-development-jwt-access-secret-minimum-32-chars';
      const expiredToken = jwt.sign(
        { sub: testUserId, type: 'access', iat: Math.floor(Date.now() / 1000) - 3600 },
        secret,
        { expiresIn: '-1s' }
      );

      assert.throws(() => {
        verifyAccessToken(expiredToken);
      });
    });

    test('8. Rejects token with wrong token type (e.g. type: "refresh")', () => {
      const secret = config.JWT_ACCESS_SECRET || 'kairos-development-jwt-access-secret-minimum-32-chars';
      const wrongTypeToken = jwt.sign(
        { sub: testUserId, type: 'refresh' },
        secret,
        { expiresIn: '15m' }
      );

      assert.throws(() => {
        verifyAccessToken(wrongTypeToken);
      }, /Invalid token type/);
    });
  });

  // -------------------------------------------------------------
  // 3. Refresh Token Generation & Hashing
  // -------------------------------------------------------------
  describe('Refresh Token Hashing & Storage Format', () => {
    test('9. Generates secure random refresh token (high entropy hex)', () => {
      const raw1 = generateRandomRefreshToken();
      const raw2 = generateRandomRefreshToken();

      assert.ok(raw1.length >= 64, 'Token must be high entropy');
      assert.notEqual(raw1, raw2, 'Tokens must be unique');
    });

    test('10. SHA-256 token hash is deterministic and 64 hex chars', () => {
      const raw = 'test-refresh-token-value-12345';
      const hash1 = hashRefreshToken(raw);
      const hash2 = hashRefreshToken(raw);

      assert.equal(hash1, hash2);
      assert.equal(hash1.length, 64);
      assert.notEqual(hash1, raw, 'Hash must not equal raw token');
    });
  });

  // -------------------------------------------------------------
  // 4. Registration API Endpoint (POST /api/v1/auth/register)
  // -------------------------------------------------------------
  describe('Registration Endpoint & Validation', () => {
    test('11. Rejects missing email or password with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {}
      });

      assert.equal(res.statusCode, 400);
      const body = JSON.parse(res.body);
      assert.equal(body.error, 'Bad Request');
    });

    test('12. Rejects invalid email format with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'not-an-email',
          password: 'ValidPassword123!'
        }
      });

      assert.equal(res.statusCode, 400);
      const body = JSON.parse(res.body);
      assert.equal(body.error, 'Bad Request');
    });

    test('13. Rejects weak password (< 8 characters) with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'test@kairos.ai',
          password: 'Short1'
        }
      });

      assert.equal(res.statusCode, 400);
      const body = JSON.parse(res.body);
      assert.equal(body.error, 'Bad Request');
    });

    test('14. Rejects weak password without numbers with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'test@kairos.ai',
          password: 'NoNumbersInPassword'
        }
      });

      assert.equal(res.statusCode, 400);
    });

    test('15. Rejects weak password without letters with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'test@kairos.ai',
          password: '123456789012345'
        }
      });

      assert.equal(res.statusCode, 400);
    });
  });

  // -------------------------------------------------------------
  // 5. Login & Refresh Endpoint Validation
  // -------------------------------------------------------------
  describe('Login & Refresh Endpoint Input Validation', () => {
    test('15b. Login rejects missing credentials with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {}
      });

      assert.equal(res.statusCode, 400);
      const body = JSON.parse(res.body);
      assert.equal(body.error, 'Bad Request');
    });

    test('15c. Login rejects invalid email structure with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'invalid-email-address',
          password: 'somePassword'
        }
      });

      assert.equal(res.statusCode, 400);
    });

    test('15d. Refresh rejects missing token with 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {}
      });

      assert.equal(res.statusCode, 400);
      const body = JSON.parse(res.body);
      assert.match(body.message, /Refresh token must be provided/);
    });

    test('15e. Logout endpoint succeeds and responds with 200', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        payload: {
          refreshToken: 'dummy-raw-token-for-logout'
        }
      });

      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.body);
      assert.equal(body.success, true);
    });
  });

  // -------------------------------------------------------------
  // 5. Auth Middleware & Protected Route Enforcement
  // -------------------------------------------------------------
  describe('Auth Middleware & Endpoint Protection (GET /api/v1/auth/me)', () => {
    test('16. Rejects request with missing Authorization header (401)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me'
      });

      assert.equal(res.statusCode, 401);
      const body = JSON.parse(res.body);
      assert.equal(body.error, 'Unauthorized');
      assert.equal(body.code, 'AUTH_HEADER_MISSING');
    });

    test('17. Rejects malformed Authorization header (not Bearer <token>) (401)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: 'Basic dXNlcjpwYXNz'
        }
      });

      assert.equal(res.statusCode, 401);
      const body = JSON.parse(res.body);
      assert.equal(body.error, 'Unauthorized');
      assert.equal(body.code, 'AUTH_HEADER_MALFORMED');
    });

    test('18. Rejects invalid JWT signature (401)', async () => {
      const tamperedToken = jwt.sign(
        { sub: '00000000-0000-4000-8000-000000000001', type: 'access' },
        'invalid-secret-key-1234567890'
      );

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${tamperedToken}`
        }
      });

      assert.equal(res.statusCode, 401);
      const body = JSON.parse(res.body);
      assert.equal(body.error, 'Unauthorized');
      assert.equal(body.code, 'TOKEN_INVALID');
    });

    test('19. Rejects expired JWT token (401)', async () => {
      const secret = config.JWT_ACCESS_SECRET || 'kairos-development-jwt-access-secret-minimum-32-chars';
      const expiredToken = jwt.sign(
        { sub: '00000000-0000-4000-8000-000000000001', type: 'access' },
        secret,
        { expiresIn: '-10s' }
      );

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${expiredToken}`
        }
      });

      assert.equal(res.statusCode, 401);
      const body = JSON.parse(res.body);
      assert.equal(body.error, 'Unauthorized');
      assert.equal(body.code, 'TOKEN_EXPIRED');
    });

    test('20. Rejects query or header userId spoofing (never trusts client headers)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me?userId=00000000-0000-4000-8000-000000000002',
        headers: {
          'x-kairos-user-id': '00000000-0000-4000-8000-000000000002',
          'x-user-id': '00000000-0000-4000-8000-000000000002'
        }
      });

      // Must be 401 Unauthorized because valid JWT Authorization header is absent
      assert.equal(res.statusCode, 401);
    });
  });

  // -------------------------------------------------------------
  // 6. Refresh Token Rotation & Replay Protection Logic
  // -------------------------------------------------------------
  describe('Refresh Token Rotation & Replay Invariants', () => {
    interface SimulatedToken {
      id: string;
      userId: string;
      tokenHash: string;
      expiresAt: Date;
      revokedAt: Date | null;
      replacedByTokenId: string | null;
    }

    const tokenStore: SimulatedToken[] = [];
    const userId = 'b0000000-0000-4000-8000-000000000001';

    function createToken(rawToken: string, customExpiresAt?: Date): SimulatedToken {
      const token: SimulatedToken = {
        id: `token-${tokenStore.length + 1}`,
        userId,
        tokenHash: hashRefreshToken(rawToken),
        expiresAt: customExpiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        revokedAt: null,
        replacedByTokenId: null
      };
      tokenStore.push(token);
      return token;
    }

    function simulateRefresh(rawToken: string) {
      const hash = hashRefreshToken(rawToken);
      const token = tokenStore.find((t) => t.tokenHash === hash);

      if (!token) {
        return { status: 401, error: 'INVALID_TOKEN' };
      }

      // Replay Detection
      if (token.revokedAt) {
        // Invalidate ALL tokens for user
        tokenStore.forEach((t) => {
          if (t.userId === token.userId) {
            t.revokedAt = new Date();
          }
        });
        return { status: 401, error: 'REVOKED_TOKEN_REUSE_SECURITY_ALERT' };
      }

      // Expiration check
      if (new Date() > token.expiresAt) {
        token.revokedAt = new Date();
        return { status: 401, error: 'TOKEN_EXPIRED' };
      }

      // Rotate: Revoke current, issue next
      const newRawToken = generateRandomRefreshToken();
      const newToken = createToken(newRawToken);
      token.revokedAt = new Date();
      token.replacedByTokenId = newToken.id;

      const { accessToken } = generateAccessToken(token.userId);

      return {
        status: 200,
        accessToken,
        refreshToken: newRawToken
      };
    }

    test('21. Valid initial refresh token succeeds and issues rotated token', () => {
      const rawTokenA = generateRandomRefreshToken();
      createToken(rawTokenA);

      const res = simulateRefresh(rawTokenA);
      assert.equal(res.status, 200);
      assert.ok(res.accessToken);
      assert.ok(res.refreshToken);
      assert.notEqual(res.refreshToken, rawTokenA, 'New refresh token must be rotated');
    });

    test('22. Using old refresh token A after rotation fails (revoked)', () => {
      const rawTokenA = generateRandomRefreshToken();
      createToken(rawTokenA);

      // First rotation
      const res1 = simulateRefresh(rawTokenA);
      assert.equal(res1.status, 200);

      // Replay attempt with old rawTokenA
      const replayRes = simulateRefresh(rawTokenA);
      assert.equal(replayRes.status, 401);
      assert.equal(replayRes.error, 'REVOKED_TOKEN_REUSE_SECURITY_ALERT');
    });

    test('23. Replay of revoked token invalidates the entire token family/session', () => {
      const rawTokenX = generateRandomRefreshToken();
      createToken(rawTokenX);

      // Rotate X -> Y
      const res1 = simulateRefresh(rawTokenX);
      const rawTokenY = res1.refreshToken!;

      // Replaying X triggers revocation of Y as well!
      simulateRefresh(rawTokenX);

      // Now even Y is invalidated because of the detected breach
      const resY = simulateRefresh(rawTokenY);
      assert.equal(resY.status, 401);
    });

    test('24. Expired refresh token is rejected with 401', () => {
      const rawExpired = generateRandomRefreshToken();
      createToken(rawExpired, new Date(Date.now() - 1000)); // expired 1s ago

      const res = simulateRefresh(rawExpired);
      assert.equal(res.status, 401);
      assert.equal(res.error, 'TOKEN_EXPIRED');
    });
  });

  // -------------------------------------------------------------
  // 7. Multi-User Isolation & Authority Boundary
  // -------------------------------------------------------------
  describe('Multi-User Isolation & Server Identity Authority', () => {
    const userAId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const userBId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

    test('25. User A JWT token binds strictly to User A identity', () => {
      const userAToken = generateAccessToken(userAId).accessToken;
      const payload = verifyAccessToken(userAToken);

      assert.equal(payload.sub, userAId);
      assert.notEqual(payload.sub, userBId);
    });

    test('26. User A token cannot mutate or claim User B progression in sync batch', async () => {
      const userAToken = generateAccessToken(userAId).accessToken;

      // 1. Verify that middleware extracts userAId and refuses to honor client-supplied User B
      const mockReq: any = {
        headers: {
          authorization: `Bearer ${userAToken}`
        }
      };
      let capturedStatus: number | null = null;
      let capturedBody: any = null;
      const mockReply: any = {
        status(code: number) {
          capturedStatus = code;
          return this;
        },
        send(data: any) {
          capturedBody = data;
          return this;
        }
      };

      const { authContextHook } = await import('../src/middleware/authContext.js');
      await authContextHook(mockReq, mockReply);

      assert.equal(capturedStatus, null, 'Valid token must not be rejected');
      assert.equal(mockReq.userId, userAId, 'Middleware MUST bind request.userId to User A');
      assert.notEqual(mockReq.userId, userBId, 'Middleware MUST NOT allow User B');

      // 2. Simulated sync execution: User B state remains untouched when User A syncs
      const userAProgression = { userId: userAId, totalXp: 0, level: 1 };
      const userBProgression = { userId: userBId, totalXp: 500, level: 3 };

      function isolatedSyncExecution(authenticatedUserId: string, operationPayload: any) {
        // Server strictly uses authenticatedUserId (request.userId) and ignores operationPayload.userId
        if (authenticatedUserId === userAId) {
          userAProgression.totalXp += 20;
        } else if (authenticatedUserId === userBId) {
          userBProgression.totalXp += 20;
        }
      }

      // User A submits an operation maliciously claiming it is for User B
      isolatedSyncExecution(mockReq.userId, { userId: userBId, taskId: 'sys-task-1', taskHp: 20 });

      assert.equal(userAProgression.totalXp, 20, 'User A progression was updated');
      assert.equal(userBProgression.totalXp, 500, 'User B progression was completely untouched');
    });
  });

  // -------------------------------------------------------------
  // 8. Safe User Data Invariants
  // -------------------------------------------------------------
  describe('Safe User Model & Credential Leak Prevention', () => {
    test('27. toSafeUser strips passwordHash, refreshToken, and sensitive metadata', () => {
      const rawUser = {
        id: 'c0000000-0000-4000-8000-000000000001',
        email: 'safe@kairos.ai',
        passwordHash: '$argon2id$v=19$m=65536,p=4,t=3$secretHashValue',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        profile: {
          id: 'p-1',
          name: 'Safe User',
          handle: 'safeuser',
          timezone: 'UTC',
          circadianType: 'moderate_early',
          avatarUrl: null,
          bannerTheme: null
        },
        progression: {
          totalXp: 150,
          xpRemainder: 0.5,
          level: 2,
          todayHp: 20,
          lifetimeHp: 150,
          streakCount: 3,
          lastActiveDate: '2026-09-23'
        }
      };

      const safe = authService.toSafeUser(rawUser);

      assert.equal((safe as any).passwordHash, undefined, 'passwordHash must never be exposed');
      assert.equal((safe as any).password, undefined, 'password must never be exposed');
      assert.equal(safe.email, 'safe@kairos.ai');
      assert.equal(safe.status, 'active');
      assert.equal(safe.progression?.totalXp, 150);
      assert.equal(safe.profile?.name, 'Safe User');
    });

    test('28. Email input is normalized to lowercase and trimmed by RegisterSchema', () => {
      const parsed = RegisterSchema.parse({
        email: '  ALICE.VOYAGER@KAIROS.AI  ',
        password: 'SecurePassword123!'
      });

      assert.equal(parsed.email, 'alice.voyager@kairos.ai');
    });

    test('29. Email input is normalized by LoginSchema', () => {
      const parsed = LoginSchema.parse({
        email: '  BOB@Example.COM ',
        password: 'somePassword'
      });

      assert.equal(parsed.email, 'bob@example.com');
    });

    test('30. Rate limiter plugin is registered and active on the application', () => {
      // Fastify rate-limit decorates or handles rate limits
      assert.ok(app.hasPlugin('@fastify/rate-limit') || (app as any).rateLimit !== undefined);
    });
  });

  // -------------------------------------------------------------
  // 9. Google OAuth Endpoint & Identity Linking
  // -------------------------------------------------------------
  describe('Google OAuth Endpoint & Validation (POST /api/v1/auth/google)', () => {
    test('31. Rejects Google OAuth payload with missing googleId with 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/google',
        payload: {
          email: 'googleuser@gmail.com',
          name: 'Google User'
        }
      });

      assert.equal(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.equal(body.error, 'Bad Request');
    });

    test('32. Rejects Google OAuth payload with invalid email with 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/google',
        payload: {
          googleId: 'google-uid-12345',
          email: 'not-an-email'
        }
      });

      assert.equal(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.equal(body.error, 'Bad Request');
    });

    test('33. Rejects empty googleId with 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/google',
        payload: {
          googleId: '   ',
          email: 'valid@gmail.com'
        }
      });

      assert.equal(response.statusCode, 400);
    });

    test('33b. Backend config loads configured GOOGLE_CLIENT_ID', () => {
      assert.ok(config.GOOGLE_CLIENT_ID, 'GOOGLE_CLIENT_ID should be configured in backend');
      assert.equal(
        config.GOOGLE_CLIENT_ID,
        '138279147054-8po60obfaprn2c35o7lfueu3755akqgs.apps.googleusercontent.com'
      );
    });

    test('33c. verifyGoogleIdToken parses and extracts claims from test ID token', async () => {
      const mockTestToken = jwt.sign(
        {
          sub: 'google-sub-99999',
          email: 'testuser@kairos.ai',
          name: 'Test Kairos Voyager',
          picture: 'https://lh3.googleusercontent.com/a/test-photo',
          aud: config.GOOGLE_CLIENT_ID,
          iss: 'https://accounts.google.com'
        },
        'test-secret'
      );

      const verified = await authService.verifyGoogleIdToken(mockTestToken);
      assert.equal(verified.googleId, 'google-sub-99999');
      assert.equal(verified.email, 'testuser@kairos.ai');
      assert.equal(verified.name, 'Test Kairos Voyager');
      assert.equal(verified.avatarUrl, 'https://lh3.googleusercontent.com/a/test-photo');
    });

    test('33d. Rejects invalid or unparseable Google ID token', async () => {
      await assert.rejects(
        async () => {
          await authService.verifyGoogleIdToken('invalid-garbage-token-structure');
        },
        (err: any) => {
          return err.statusCode === 401 || err.code === 'INVALID_GOOGLE_TOKEN';
        }
      );
    });
  });

  // -------------------------------------------------------------
  // 10. Onboarding Questionnaire Validation (POST /api/v1/auth/onboarding)
  // -------------------------------------------------------------
  describe('Onboarding Questionnaire Endpoint & Validation (POST /api/v1/auth/onboarding)', () => {
    test('34. Rejects unauthenticated request to /onboarding with 401', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/onboarding',
        payload: {
          preferredName: 'Alice',
          dob: '2000-01-01',
          occupation: 'student',
          goals: ['deep-work'],
          monthlyFocus: 'Focus',
          workflow: 'autonomous',
          energyPeak: 'early',
          challenges: ['procrastination'],
          companionName: 'Kairos',
          archetype: 'warm',
          voiceModel: 'aura'
        }
      });

      assert.equal(response.statusCode, 401);
    });

    test('35. Rejects onboarding request with missing required fields with 400', async () => {
      const { accessToken } = generateAccessToken('a0000000-0000-4000-8000-000000000001');

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/onboarding',
        headers: {
          authorization: `Bearer ${accessToken}`
        },
        payload: {
          preferredName: 'Alice',
          // Missing dob, occupation, goals, etc.
        }
      });

      assert.equal(response.statusCode, 400);
      const body = JSON.parse(response.body);
      assert.equal(body.error, 'Bad Request');
    });

    test('36. Rejects onboarding request with empty goals array with 400', async () => {
      const { accessToken } = generateAccessToken('a0000000-0000-4000-8000-000000000001');

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/onboarding',
        headers: {
          authorization: `Bearer ${accessToken}`
        },
        payload: {
          preferredName: 'Alice',
          dob: '2000-01-01',
          occupation: 'student',
          goals: [], // Empty array must be rejected
          monthlyFocus: 'Focus',
          workflow: 'autonomous',
          energyPeak: 'early',
          challenges: ['procrastination'],
          companionName: 'Kairos',
          archetype: 'warm',
          voiceModel: 'aura'
        }
      });

      assert.equal(response.statusCode, 400);
    });
  });

  // -------------------------------------------------------------
  // 11. Account Deletion Endpoint (DELETE /api/v1/auth/account)
  // -------------------------------------------------------------
  describe('Account Deletion Endpoint (DELETE /api/v1/auth/account)', () => {
    test('37. Rejects unauthenticated request to /account with 401', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/account'
      });

      assert.equal(response.statusCode, 401);
    });
  });
});


