import { apiClient } from '../api/services/apiClient';
import { API_CONFIG } from '../api/config/apiConfig';
import { authSession } from './authSession';
import {
  LoginCredentials,
  RegisterCredentials,
  AuthSessionResponse,
  SafeAuthUser
} from './authTypes';

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
      authSession.setSession(session);
      return session;
    } catch {
      authSession.clearSession();
      return null;
    }
  }

  /**
   * Logs out the user session from the backend and clears in-memory state.
   */
  public async logout(): Promise<void> {
    try {
      await apiClient.post(API_CONFIG.ENDPOINTS.AUTH_LOGOUT, {}, { skipAutoRefresh: true });
    } catch {
      // Graceful logout even if network is down
    } finally {
      authSession.clearSession();
    }
  }

  /**
   * Fetches safe profile and progression info for current authenticated user.
   */
  public async getMe(): Promise<SafeAuthUser> {
    const res = await apiClient.get<{ user: SafeAuthUser }>(API_CONFIG.ENDPOINTS.AUTH_ME);
    return res.user;
  }
}

export const authApi = new AuthApi();
