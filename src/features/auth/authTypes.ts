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
  onboardingCompleted?: boolean;
  dob?: string | null;
  occupation?: string | null;
  goals?: any;
  monthlyFocus?: string | null;
  workflow?: string | null;
  energyPeak?: string | null;
  challenges?: any;
  companionName?: string | null;
  archetype?: string | null;
  voiceModel?: string | null;
  pace?: number | null;
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
  name?: string;
  onboardingCompleted?: boolean;
  avatarUrl?: string | null;
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

export interface GoogleAuthPayload {
  idToken?: string;
  googleId?: string;
  email?: string;
  name?: string;
  avatarUrl?: string | null;
  givenName?: string;
  familyName?: string;
}

export interface OnboardingData {
  preferredName: string;
  dob: string;
  occupation: string;
  goals: string[];
  monthlyFocus: string;
  workflow: string;
  energyPeak: string;
  challenges: string[];
  companionName: string;
  archetype: string;
  voiceModel: string;
  pace?: number;
}

export type AuthStateMachineStatus =
  | 'BOOTING'
  | 'SPLASH'
  | 'UNAUTHENTICATED'
  | 'AUTHENTICATING'
  | 'AUTHENTICATED'
  | 'LOGGING_OUT'
  | 'ACCOUNT_DELETING';

export interface AuthState {
  isAuthenticated: boolean;
  user: SafeAuthUser | null;
  hasOfflineAccess: boolean;
  isLoading: boolean;
  status: AuthStateMachineStatus;
}

