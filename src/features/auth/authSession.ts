import { SafeAuthUser, AuthSessionResponse } from './authTypes';

/**
 * Kairos In-Memory Auth Session Manager
 * 
 * Strict Security Rules:
 * - Access token is kept strictly in-memory (never persisted in localStorage).
 * - Refresh token is managed via HttpOnly Secure SameSite cookie on web (or secure storage on mobile).
 * - Multi-user transitions cleanly wipe in-memory token state.
 */

type AuthListener = (user: SafeAuthUser | null, isAuthenticated: boolean) => void;

class AuthSessionManager {
  private accessToken: string | null = null;
  private currentUser: SafeAuthUser | null = null;
  private listeners: Set<AuthListener> = new Set();

  /**
   * Returns current active in-memory JWT Access Token.
   */
  public getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Sets in-memory JWT Access Token.
   */
  public setAccessToken(token: string | null): void {
    this.accessToken = token;
    this.notifyListeners();
  }

  /**
   * Returns authenticated user profile if available.
   */
  public getCurrentUser(): SafeAuthUser | null {
    return this.currentUser;
  }

  /**
   * Sets or updates current authenticated user and notifies listeners.
   */
  public setCurrentUser(user: SafeAuthUser | null): void {
    this.currentUser = user;
    this.notifyListeners();
  }

  /**
   * Checks if an authenticated in-memory session exists.
   */
  public isAuthenticated(): boolean {
    return this.accessToken !== null && this.currentUser !== null;
  }

  /**
   * Updates full session from backend auth response.
   */
  public setSession(session: AuthSessionResponse): void {
    this.accessToken = session.accessToken;
    this.currentUser = session.user;
    this.notifyListeners();
  }

  /**
   * Clears the in-memory session on logout or session expiration.
   */
  public clearSession(): void {
    this.accessToken = null;
    this.currentUser = null;
    this.notifyListeners();
  }

  /**
   * Subscribes to auth state changes.
   */
  public subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    listener(this.currentUser, this.isAuthenticated());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const isAuth = this.isAuthenticated();
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentUser, isAuth);
      } catch (err) {
        console.error('Error in auth session listener:', err);
      }
    });
  }
}

export const authSession = new AuthSessionManager();
