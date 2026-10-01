import { apiClient } from '../api/services/apiClient';
import { API_CONFIG } from '../api/config/apiConfig';
import { authSession } from './authSession';
import {
  LoginCredentials,
  RegisterCredentials,
  GoogleAuthPayload,
  OnboardingData,
  AuthSessionResponse,
  SafeAuthUser
} from './authTypes';
import { NetworkError, TimeoutError, UnauthorizedError } from '../api/errors/apiErrors';

const STORAGE_KEY_USER_PROFILE = 'KAIROS_USER_PROFILE_V1';

export class AuthApi {
  /**
   * Registers a new user account with the backend API.
   */
  public async register(credentials: RegisterCredentials): Promise<AuthSessionResponse> {
    const session = await apiClient.post<AuthSessionResponse>(
      API_CONFIG.ENDPOINTS.AUTH_REGISTER,
      credentials,
      { skipAuth: true, skipAutoRefresh: true }
    );
    authSession.setSession(session);
    this.persistCachedUser(session.user);
    return session;
  }

  /**
   * Authenticates an existing user account with email and password.
   */
  public async login(credentials: LoginCredentials): Promise<AuthSessionResponse> {
    const session = await apiClient.post<AuthSessionResponse>(
      API_CONFIG.ENDPOINTS.AUTH_LOGIN,
      credentials,
      { skipAuth: true, skipAutoRefresh: true }
    );
    authSession.setSession(session);
    this.persistCachedUser(session.user);
    return session;
  }

  /**
   * Authenticates via Google OAuth provider identity.
   */
  public async loginWithGoogle(payload: GoogleAuthPayload): Promise<AuthSessionResponse> {
    const session = await apiClient.post<AuthSessionResponse>(
      API_CONFIG.ENDPOINTS.AUTH_GOOGLE,
      payload,
      { skipAuth: true, skipAutoRefresh: true }
    );
    authSession.setSession(session);
    this.persistCachedUser(session.user);
    return session;
  }

  /**
   * Rotates and refreshes the access token using the stored refresh cookie or token.
   */
  public async refresh(): Promise<AuthSessionResponse | null> {
    try {
      const session = await apiClient.post<AuthSessionResponse>(
        API_CONFIG.ENDPOINTS.AUTH_REFRESH,
        {},
        { skipAuth: true, skipAutoRefresh: true }
      );
      if (session && session.user) {
        authSession.setSession(session);
        this.persistCachedUser(session.user);
        return session;
      }
      return null;
    } catch (err: any) {
      if (
        err instanceof UnauthorizedError ||
        (err as any)?.statusCode === 401 ||
        (err as any)?.statusCode === 400 ||
        err?.name === 'ValidationError'
      ) {
        authSession.clearSession();
        this.clearCachedUser();
        return null;
      }
      throw err;
    }
  }

  /**
   * Authoritative Session Restoration during Startup Splash (Case A/B/C/D).
   * 
   * Offline-First Invariant:
   * 1. If backend is online, validate and refresh token.
   * 2. If backend is temporarily unreachable (NetworkError/Timeout), check for valid local cached profile.
   *    If an already-onboarded user exists locally, restore offline session without kicking to Welcome.
   * 3. If session is explicitly rejected/expired (401/400), clear credentials and route to Welcome.
   */
  public async restoreSession(): Promise<{ user: SafeAuthUser; onboardingCompleted: boolean; isOffline?: boolean } | null> {
    try {
      const session = await this.refresh();
      if (session && session.user) {
        let user = session.user;
        try {
          user = await this.getMe();
        } catch {
          // getMe failed, use session user
        }
        const onboardingCompleted = Boolean(user.profile?.onboardingCompleted);
        const safeUser = {
          ...user,
          onboardingCompleted
        };
        this.persistCachedUser(safeUser);
        return {
          user: safeUser,
          onboardingCompleted
        };
      }
      authSession.clearSession();
      this.clearCachedUser();
      return null;
    } catch (err: any) {
      // Check if failure is due to backend offline/unreachable
      const isNetworkFailure =
        err instanceof NetworkError ||
        err instanceof TimeoutError ||
        err?.name === 'NetworkError' ||
        err?.name === 'TimeoutError' ||
        err?.code === 'NETWORK_ERROR' ||
        err?.code === 'REQUEST_TIMEOUT' ||
        err?.message?.includes('fetch') ||
        err?.message?.includes('Network') ||
        err?.message?.includes('Failed to fetch');

      if (isNetworkFailure) {
        const cached = this.loadCachedUser();
        if (cached && (cached.id || (cached as any).userId) && cached.email) {
          const onboardingCompleted =
            cached.onboardingCompleted === true ||
            cached.profile?.onboardingCompleted === true;

          if (onboardingCompleted) {
            return {
              user: cached,
              onboardingCompleted: true,
              isOffline: true
            };
          }
        }
      }

      authSession.clearSession();
      this.clearCachedUser();
      return null;
    }
  }

  /**
   * Submits completed manual onboarding questions to backend.
   */
  public async submitOnboarding(data: OnboardingData): Promise<SafeAuthUser> {
    const res = await apiClient.post<{ user: SafeAuthUser; message: string }>(
      API_CONFIG.ENDPOINTS.AUTH_ONBOARDING,
      data
    );
    if (res.user) {
      const currentToken = authSession.getAccessToken();
      if (currentToken) {
        authSession.setSession({
          accessToken: currentToken,
          tokenType: 'Bearer',
          expiresIn: '15m',
          user: res.user
        });
      }
      this.persistCachedUser(res.user);
    }
    return res.user;
  }

  /**
   * Logs out the user session from the backend and clears in-memory and local state.
   */
  public async logout(): Promise<void> {
    try {
      await apiClient.post(API_CONFIG.ENDPOINTS.AUTH_LOGOUT, {}, { skipAutoRefresh: true });
    } catch {
      // Graceful logout even if network is down
    } finally {
      authSession.clearSession();
      this.clearCachedUser();
    }
  }

  /**
   * Permanently deletes user account from the backend and clears credentials.
   * Strictly ONLINE-REQUIRED: throws if backend cannot be reached.
   */
  public async deleteAccount(): Promise<void> {
    await apiClient.delete(API_CONFIG.ENDPOINTS.AUTH_ACCOUNT);
    authSession.clearSession();
    this.clearCachedUser();
  }

  /**
   * Fetches safe profile and progression info for current authenticated user.
   */
  public async getMe(): Promise<SafeAuthUser> {
    const res = await apiClient.get<{ user: SafeAuthUser }>(API_CONFIG.ENDPOINTS.AUTH_ME);
    return res.user;
  }

  /**
   * Authoritatively updates user profile on the backend and broadcasts updates to all active UI screens.
   */
  public async updateProfile(updates: {
    name?: string;
    handle?: string;
    bio?: string;
    quote?: string;
    avatarUrl?: string | null;
    bannerTheme?: string;
    onboardingCompleted?: boolean;
  }): Promise<SafeAuthUser> {
    const res = await apiClient.patch<{ user: SafeAuthUser; message: string }>(
      API_CONFIG.ENDPOINTS.AUTH_PROFILE,
      updates
    );

    if (res.user) {
      authSession.setCurrentUser(res.user);
      this.persistCachedUser(res.user);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('kairos_user_profile_updated', { detail: res.user })
        );
      }
    }

    return res.user;
  }

  /**
   * Fetches profile details directly from /api/v1/auth/profile.
   */
  public async getProfile(): Promise<SafeAuthUser> {
    const res = await apiClient.get<{ user: SafeAuthUser }>(API_CONFIG.ENDPOINTS.AUTH_PROFILE);
    if (res.user) {
      authSession.setCurrentUser(res.user);
      this.persistCachedUser(res.user);
    }
    return res.user;
  }

  private persistCachedUser(user: SafeAuthUser): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(user));
      }
    } catch {}
  }

  private loadCachedUser(): SafeAuthUser | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY_USER_PROFILE);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.email === 'string') {
            return parsed;
          }
        }
      }
    } catch {}
    return null;
  }

  private clearCachedUser(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY_USER_PROFILE);
      }
    } catch {}
  }
}

export const authApi = new AuthApi();

