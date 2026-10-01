/**
 * Kairos Frontend Centralized API Configuration
 * 
 * Supports dynamic configuration via VITE_API_BASE_URL (defaults to http://localhost:5000 in dev).
 * In later phases (e.g. Cloudflare Tunnel), this allows zero-rebuild tunneling and remote sync.
 */

// Safe fallback getter for Vite environment variables
function getEnvBaseUrl(): string {
  try {
    const metaEnv = (import.meta as any)?.env;
    if (metaEnv && metaEnv.VITE_API_BASE_URL) {
      return String(metaEnv.VITE_API_BASE_URL).replace(/\/+$/, '');
    }
  } catch {}

  // In browser environments:
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const host = window.location.hostname;
    // When accessing via LAN IP, localhost, or dev machine on port 3000, target backend on port 5000
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)
    ) {
      return `http://${host}:5000`;
    }
    // Remote production domains (e.g. Cloudflare / HTTPS custom domain)
    if (window.location.origin) {
      return window.location.origin.replace(/\/+$/, '');
    }
  }

  return 'http://localhost:5000';
}

export const API_CONFIG = {
  BASE_URL: getEnvBaseUrl(),
  TIMEOUT_MS: 10000, // 10 seconds
  MAX_RETRIES: 3,
  ENDPOINTS: {
    // Health & Reachability
    HEALTH: '/health',
    API_V1_HEALTH: '/api/v1/health',
    SYNC_STATUS: '/api/v1/sync/status',

    // Authentication (Phase E.4/E.5)
    AUTH_REGISTER: '/api/v1/auth/register',
    AUTH_LOGIN: '/api/v1/auth/login',
    AUTH_GOOGLE: '/api/v1/auth/google',
    AUTH_REFRESH: '/api/v1/auth/refresh',
    AUTH_LOGOUT: '/api/v1/auth/logout',
    AUTH_ME: '/api/v1/auth/me',
    AUTH_ONBOARDING: '/api/v1/auth/onboarding',
    AUTH_ACCOUNT: '/api/v1/auth/account',
    AUTH_PROFILE: '/api/v1/auth/profile',

    // Synchronization (Phase E.3 / E.5)
    SYNC_BATCH: '/api/v1/sync/batch',
    SYNC_STATE: '/api/v1/sync/state'
  }
} as const;

/**
 * Returns full URL for a given endpoint path.
 */
export function getApiUrl(endpoint: string): string {
  const base = API_CONFIG.BASE_URL.replace(/\/+$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}
