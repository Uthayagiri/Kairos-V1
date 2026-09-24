/**
 * Kairos Frontend Authentication Types (Phase E.4/E.5)
 */

export interface SafeUserProfile {
  id: string;
  name: string;
  handle: string | null;
  bio: string | null;
  quote: string | null;
  timezone: string;
  circadianType: string;
  avatarUrl: string | null;
  bannerTheme: string | null;
}

export interface SafeProgressionSnapshot {
  totalXp: number;
  xpRemainder: number;
  level: number;
  todayHp: number;
  lifetimeHp: number;
  streakCount: number;
  lastActiveDate: string;
}

export interface SafeAuthUser {
  id: string;
  email: string;
  status: string;
  createdAt: string;
  profile?: SafeUserProfile | null;
  progression?: SafeProgressionSnapshot | null;
}

export interface AuthSessionResponse {
  accessToken: string;
  refreshToken?: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: SafeAuthUser;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: SafeAuthUser | null;
  hasOfflineAccess: boolean;
  isLoading: boolean;
}
