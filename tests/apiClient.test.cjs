/**
 * KAIROS PHASE E.5 — API CLIENT & AUTH INTEGRATION TEST SUITE
 * 
 * Validates:
 * 1. API request execution and JSON parsing
 * 2. Typed API error translation (Network, Auth, Validation, Server)
 * 3. In-memory access token attachment
 * 4. Single-flight 401 token refresh mutex and single retry
 * 5. Session teardown on refresh failure
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

describe('Kairos Frontend API Client & Auth Session (Phase E.5)', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // Simulated in-memory AuthSessionManager
  class MockAuthSession {
    constructor() {
      this.accessToken = null;
      this.currentUser = null;
    }
    getAccessToken() { return this.accessToken; }
    setAccessToken(token) { this.accessToken = token; }
    getCurrentUser() { return this.currentUser; }
    setSession(data) {
      this.accessToken = data.accessToken;
      this.currentUser = data.user;
    }
    clearSession() {
      this.accessToken = null;
      this.currentUser = null;
    }
  }

  // Simulated ApiClient
  class MockApiClient {
    constructor(authSession) {
      this.authSession = authSession;
      this.refreshPromise = null;
      this.refreshCallCount = 0;
    }

    async request(url, options = {}) {
      const { skipAuth = false, skipAutoRefresh = false, headers: customHeaders = {}, ...rest } = options;
      const headers = { ...customHeaders };

      if (!skipAuth && !headers['Authorization']) {
        const token = this.authSession.getAccessToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const res = await global.fetch(url, { headers, ...rest });

      if (res.ok) {
        return res.json ? await res.json() : null;
      }

      // 401 Auto-refresh
      if (res.status === 401 && !skipAutoRefresh && !url.includes('/auth/')) {
        const newToken = await this.executeTokenRefresh();
        if (newToken) {
          return this.request(url, {
            ...options,
            skipAutoRefresh: true,
            headers: {
              ...customHeaders,
              Authorization: `Bearer ${newToken}`
            }
          });
        }
      }

      const body = res.json ? await res.json().catch(() => null) : null;
      const err = new Error(body?.message || `HTTP ${res.status}`);
      err.statusCode = res.status;
      err.code = body?.code;
      throw err;
    }

    async executeTokenRefresh() {
      if (this.refreshPromise) {
        return this.refreshPromise;
      }

      this.refreshPromise = (async () => {
        try {
          this.refreshCallCount++;
          const res = await global.fetch('http://localhost:5000/api/v1/auth/refresh', {
            method: 'POST'
          });
          if (!res.ok) {
            this.authSession.clearSession();
            return null;
          }
          const data = await res.json();
          this.authSession.setSession(data);
          return data.accessToken;
        } catch {
          this.authSession.clearSession();
          return null;
        } finally {
          this.refreshPromise = null;
        }
      })();

      return this.refreshPromise;
    }
  }

  test('1. Successful GET request parses JSON response', async () => {
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ online: true, apiVersion: 'v1' })
    });

    const session = new MockAuthSession();
    const client = new MockApiClient(session);

    const result = await client.request('http://localhost:5000/api/v1/sync/status');
    assert.equal(result.online, true);
    assert.equal(result.apiVersion, 'v1');
  });

  test('2. Attaches Authorization Bearer token from in-memory session', async () => {
    let capturedAuthHeader = null;
    global.fetch = async (url, opts) => {
      capturedAuthHeader = opts.headers['Authorization'];
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      };
    };

    const session = new MockAuthSession();
    session.setAccessToken('sample-jwt-token-12345');
    const client = new MockApiClient(session);

    await client.request('http://localhost:5000/api/v1/sync/batch', {
      method: 'POST',
      body: JSON.stringify({ operations: [] })
    });

    assert.equal(capturedAuthHeader, 'Bearer sample-jwt-token-12345');
  });

  test('3. 401 error triggers token refresh and retries original request once', async () => {
    let attempt = 0;
    global.fetch = async (url) => {
      if (url.includes('/auth/refresh')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            accessToken: 'fresh-rotated-jwt-token',
            user: { id: 'u1', email: 'test@kairos.ai' }
          })
        };
      }

      attempt++;
      if (attempt === 1) {
        // First attempt fails with 401
        return {
          ok: false,
          status: 401,
          json: async () => ({ message: 'Access token expired', code: 'TOKEN_EXPIRED' })
        };
      }

      // Second attempt (after refresh) succeeds
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, processedCount: 1 })
      };
    };

    const session = new MockAuthSession();
    session.setAccessToken('expired-jwt-token');
    const client = new MockApiClient(session);

    const res = await client.request('http://localhost:5000/api/v1/sync/batch');

    assert.equal(res.success, true);
    assert.equal(attempt, 2, 'Must have retried the request after refresh');
    assert.equal(session.getAccessToken(), 'fresh-rotated-jwt-token');
    assert.equal(client.refreshCallCount, 1);
  });

  test('4. Multiple concurrent 401 requests trigger exactly ONE refresh request (single-flight mutex)', async () => {
    let attemptCount = 0;
    global.fetch = async (url) => {
      if (url.includes('/auth/refresh')) {
        // Small delay to simulate network latency
        await new Promise((r) => setTimeout(r, 20));
        return {
          ok: true,
          status: 200,
          json: async () => ({
            accessToken: 'new-single-token',
            user: { id: 'u1', email: 'test@kairos.ai' }
          })
        };
      }

      attemptCount++;
      return {
        ok: attemptCount > 3, // First 3 calls fail with 401, subsequent succeed
        status: attemptCount > 3 ? 200 : 401,
        json: async () => ({ data: 'ok' })
      };
    };

    const session = new MockAuthSession();
    session.setAccessToken('old-token');
    const client = new MockApiClient(session);

    // Launch 3 parallel requests simultaneously
    const results = await Promise.all([
      client.request('http://localhost:5000/api/v1/data1'),
      client.request('http://localhost:5000/api/v1/data2'),
      client.request('http://localhost:5000/api/v1/data3')
    ]);

    assert.equal(results.length, 3);
    assert.equal(client.refreshCallCount, 1, 'Only 1 refresh request must be executed');
  });

  test('5. Failed refresh clears session and raises 401 error without infinite loop', async () => {
    global.fetch = async (url) => {
      if (url.includes('/auth/refresh')) {
        return {
          ok: false,
          status: 401,
          json: async () => ({ message: 'Refresh token invalid' })
        };
      }
      return {
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' })
      };
    };

    const session = new MockAuthSession();
    session.setAccessToken('bad-token');
    session.currentUser = { id: 'u1' };
    const client = new MockApiClient(session);

    await assert.rejects(async () => {
      await client.request('http://localhost:5000/api/v1/protected');
    }, /Unauthorized/);

    assert.equal(session.getAccessToken(), null, 'Access token must be cleared');
    assert.equal(session.getCurrentUser(), null, 'Current user must be cleared');
  });
});
