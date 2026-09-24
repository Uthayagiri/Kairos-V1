import { API_CONFIG, getApiUrl } from '../config/apiConfig';
import {
  ApiError,
  NetworkError,
  TimeoutError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  ServerError
} from '../errors/apiErrors';
import { authSession } from '../../auth/authSession';
import { AuthSessionResponse } from '../../auth/authTypes';

export interface RequestOptions extends RequestInit {
  timeout?: number;
  skipAuth?: boolean;
  skipAutoRefresh?: boolean;
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiClient {
  // Shared promise mutex for single concurrent refresh token request
  private refreshPromise: Promise<string | null> | null = null;

  /**
   * Core HTTP request handler with timeout, typed error mapping, and single-flight 401 retry.
   */
  public async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const {
      timeout = API_CONFIG.TIMEOUT_MS,
      skipAuth = false,
      skipAutoRefresh = false,
      params,
      headers: customHeaders,
      ...fetchOptions
    } = options;

    let url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
      ? endpoint
      : getApiUrl(endpoint);

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }

    const headers = new Headers(customHeaders || {});
    if (!headers.has('Content-Type') && fetchOptions.body && typeof fetchOptions.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    // Attach in-memory Bearer token if present
    if (!skipAuth && !headers.has('Authorization')) {
      const token = authSession.getAccessToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
        credentials: 'include' // Sends HttpOnly refresh cookies across origins
      });

      clearTimeout(timer);

      // 1. Handle HTTP Success (200 - 299)
      if (response.ok) {
        if (response.status === 204) {
          return null as any;
        }
        const text = await response.text();
        return text ? JSON.parse(text) : (null as any);
      }

      // 2. Handle 401 Unauthorized with Automatic Single Token Refresh
      if (response.status === 401 && !skipAutoRefresh && !this.isAuthRoute(endpoint)) {
        const refreshedToken = await this.executeTokenRefresh();
        if (refreshedToken) {
          // Retry original request ONCE with new access token
          return this.request<T>(endpoint, {
            ...options,
            skipAutoRefresh: true, // Prevent recursive loops
            headers: {
              ...(customHeaders as any),
              Authorization: `Bearer ${refreshedToken}`
            }
          });
        }
      }

      // 3. Parse Error Payload and throw typed exception
      let errorPayload: any = null;
      try {
        errorPayload = await response.json();
      } catch {
        // Response was not JSON
      }

      const message = errorPayload?.message || response.statusText || 'API request failed';
      const code = errorPayload?.code;

      switch (response.status) {
        case 400:
          throw new ValidationError(message, errorPayload?.details || errorPayload);
        case 401:
          throw new UnauthorizedError(message, errorPayload);
        case 403:
          throw new ForbiddenError(message, errorPayload);
        case 404:
          throw new NotFoundError(message, errorPayload);
        case 409:
          throw new ConflictError(message, errorPayload);
        default:
          if (response.status >= 500) {
            throw new ServerError(message, response.status, errorPayload);
          }
          throw new ApiError(message, response.status, code, errorPayload);
      }
    } catch (err: any) {
      clearTimeout(timer);

      if (err instanceof ApiError) {
        throw err;
      }

      if (err.name === 'AbortError') {
        throw new TimeoutError(`Request timeout after ${timeout}ms: ${endpoint}`);
      }

      throw new NetworkError(err.message || 'Network request failed');
    }
  }

  /**
   * Helper to check if route is an auth endpoint where 401 should not trigger refresh retry.
   */
  private isAuthRoute(endpoint: string): boolean {
    return (
      endpoint.includes('/auth/login') ||
      endpoint.includes('/auth/register') ||
      endpoint.includes('/auth/refresh') ||
      endpoint.includes('/auth/logout')
    );
  }

  /**
   * Executes a refresh request with single-flight promise locking.
   * If 5 requests trigger 401 concurrently, they all await this single promise.
   */
  public async executeTokenRefresh(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const refreshUrl = getApiUrl(API_CONFIG.ENDPOINTS.AUTH_REFRESH);
        const res = await fetch(refreshUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          credentials: 'include'
        });

        if (!res.ok) {
          authSession.clearSession();
          return null;
        }

        const data: AuthSessionResponse = await res.json();
        authSession.setSession(data);
        return data.accessToken;
      } catch (err) {
        authSession.clearSession();
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // Convenience Methods
  public get<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined
    });
  }

  public put<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined
    });
  }

  public patch<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined
    });
  }

  public delete<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
