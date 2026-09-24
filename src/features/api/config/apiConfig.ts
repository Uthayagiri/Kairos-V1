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

  // In browser environments on remote production domains (e.g. Cloudflare / HTTPS),
  // default to current origin rather than dead localhost:5000
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const host = window.location.hostname;
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
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

    // Authentication (Phase E.4)
    AUTH_REGISTER: '/api/v1/auth/register',
    AUTH_LOGIN: '/api/v1/auth/login',
    AUTH_REFRESH: '/api/v1/auth/refresh',
    AUTH_LOGOUT: '/api/v1/auth/logout',
    AUTH_ME: '/api/v1/auth/me',

    // Synchronization (Phase E.3 / E.5)
    SYNC_BATCH: '/api/v1/sync/batch'
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
