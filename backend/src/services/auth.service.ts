import { prisma } from '../db/prisma.js';
import { RegisterSchema, LoginSchema, RegisterInput, LoginInput } from '../validators/auth.schemas.js';
import { UUIDSchema } from '../validators/schemas.js';
import {
  hashPassword,
  verifyPassword,
  generateRandomRefreshToken,
  hashRefreshToken,
  generateAccessToken
} from '../utils/security.utils.js';

export interface SafeUser {
  id: string;
  email: string;
  status: string;
  createdAt: Date;
  profile: {
    id: string;
    name: string;
    handle: string | null;
    bio: string | null;
    quote: string | null;
    timezone: string;
    circadianType: string;
    avatarUrl: string | null;
    bannerTheme: string | null;
  } | null;
  progression: {
    totalXp: number;
    xpRemainder: number;
    level: number;
    todayHp: number;
    lifetimeHp: number;
    streakCount: number;
    lastActiveDate: string;
  } | null;
}

export interface AuthSessionResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: SafeUser;
}

export class AuthService {
  /**
   * Helper to format safe user object excluding sensitive security fields.
   */
  public toSafeUser(user: any): SafeUser {
    return {
      id: user.id,
      email: user.email,
      status: user.status ?? 'active',
      createdAt: user.createdAt,
      profile: user.profile
        ? {
            id: user.profile.id,
            name: user.profile.name,
            handle: user.profile.handle ?? null,
            bio: user.profile.bio ?? null,
            quote: user.profile.quote ?? null,
            timezone: user.profile.timezone,
            circadianType: user.profile.circadianType,
            avatarUrl: user.profile.avatarUrl ?? null,
            bannerTheme: user.profile.bannerTheme ?? null
          }
        : null,
      progression: user.progression
        ? {
            totalXp: user.progression.totalXp,
            xpRemainder: user.progression.xpRemainder,
            level: user.progression.level,
            todayHp: user.progression.todayHp,
            lifetimeHp: user.progression.lifetimeHp,
            streakCount: user.progression.streakCount,
            lastActiveDate: user.progression.lastActiveDate
          }
        : null
    };
  }

  /**
   * Registers a new user account.
   * 
   * Process:
   * 1. Validate inputs (email format, password complexity).
   * 2. Normalize email.
   * 3. Check for existing user (reject duplicates with 409).
   * 4. Hash password with Argon2id.
   * 5. Atomically create User, UserProfile, ProgressionState, and initial RefreshToken.
   * 6. Issue Access Token + Refresh Token.
   */
  public async register(input: RegisterInput): Promise<AuthSessionResponse> {
    const validated = RegisterSchema.parse(input);
    const normalizedEmail = validated.email.toLowerCase().trim();

    // 1. Duplicate check
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existing) {
      const error: any = new Error('An account with this email address already exists.');
      error.statusCode = 409;
      error.code = 'DUPLICATE_EMAIL';
      throw error;
    }

    // 2. Hash password with Argon2id
    const passwordHash = await hashPassword(validated.password);

    // 3. Generate tokens
    const rawRefreshToken = generateRandomRefreshToken();
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // 4. Atomic database creation
    const createdUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          status: 'active'
        }
      });

      const profile = await tx.userProfile.create({
        data: {
          userId: user.id,
          name: validated.name || normalizedEmail.split('@')[0] || 'Kairos Voyager'
        }
      });

      const progression = await tx.progressionState.create({
        data: {
          userId: user.id,
          totalXp: 0,
          xpRemainder: 0.0,
          level: 1,
          todayHp: 0,
          lifetimeHp: 0,
          streakCount: 0,
          lastActiveDate: ''
        }
      });

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: refreshTokenExpiresAt
        }
      });

      return {
        ...user,
        profile,
        progression
      };
    });

    // 5. Generate access token
    const { accessToken, expiresIn } = generateAccessToken(createdUser.id);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      tokenType: 'Bearer',
      expiresIn,
      user: this.toSafeUser(createdUser)
    };
  }

  /**
   * Authenticates an existing user via email and password.
   * 
   * Process:
   * 1. Normalize email and lookup user.
   * 2. Verify password with Argon2id constant-time comparison.
   * 3. Validate user status.
   * 4. Issue new Access Token and persistent Refresh Token.
   */
  public async login(input: LoginInput): Promise<AuthSessionResponse> {
    const validated = LoginSchema.parse(input);
    const normalizedEmail = validated.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        profile: true,
        progression: true
      }
    });

    if (!user || user.deletedAt) {
      const error: any = new Error('Invalid email or password.');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    const isValidPassword = await verifyPassword(user.passwordHash, validated.password);
    if (!isValidPassword) {
      const error: any = new Error('Invalid email or password.');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    if (user.status !== 'active') {
      const error: any = new Error('Account is suspended or inactive.');
      error.statusCode = 403;
      error.code = 'ACCOUNT_INACTIVE';
      throw error;
    }

    // Generate tokens
    const { accessToken, expiresIn } = generateAccessToken(user.id);
    const rawRefreshToken = generateRandomRefreshToken();
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Persist refresh token hash
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: refreshTokenExpiresAt
      }
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      tokenType: 'Bearer',
      expiresIn,
      user: this.toSafeUser(user)
    };
  }

  /**
   * Refreshes access token with Refresh Token Rotation.
   * 
   * Invariants:
   * 1. One-time use: Revokes incoming refresh token immediately.
   * 2. Replay detection: If an already-revoked refresh token is reused, ALL refresh tokens
   *    for that user are revoked immediately (session termination on suspected breach).
   * 3. Expiration check: Rejects expired tokens.
   */
  public async refresh(rawRefreshToken: string): Promise<AuthSessionResponse> {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string' || rawRefreshToken.trim() === '') {
      const error: any = new Error('Refresh token is required.');
      error.statusCode = 401;
      error.code = 'MISSING_REFRESH_TOKEN';
      throw error;
    }

    const tokenHash = hashRefreshToken(rawRefreshToken.trim());

    // Lookup token record
    const tokenRecord = await prisma.refreshToken.findFirst({
      where: { tokenHash },
      include: {
        user: {
          include: {
            profile: true,
            progression: true
          }
        }
      }
    });

    if (!tokenRecord) {
      const error: any = new Error('Invalid or unrecognized refresh token.');
      error.statusCode = 401;
      error.code = 'INVALID_REFRESH_TOKEN';
      throw error;
    }

    // Replay attack detection: token was already revoked!
    if (tokenRecord.revokedAt) {
      // Invalidate all active tokens for this user immediately
      await prisma.refreshToken.updateMany({
        where: {
          userId: tokenRecord.userId,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });

      const error: any = new Error(
        'Revoked refresh token reused. All sessions terminated for security reasons.'
      );
      error.statusCode = 401;
      error.code = 'REVOKED_TOKEN_REUSE';
      throw error;
    }

    // Expiration check
    if (new Date() > tokenRecord.expiresAt) {
      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revokedAt: new Date() }
      });

      const error: any = new Error('Refresh token has expired.');
      error.statusCode = 401;
      error.code = 'EXPIRED_REFRESH_TOKEN';
      throw error;
    }

    // Check user account status
    if (tokenRecord.user.status !== 'active' || tokenRecord.user.deletedAt) {
      const error: any = new Error('Account is inactive.');
      error.statusCode = 403;
      error.code = 'ACCOUNT_INACTIVE';
      throw error;
    }

    // Generate rotated refresh token
    const newRawRefreshToken = generateRandomRefreshToken();
    const newTokenHash = hashRefreshToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Atomically revoke old token and insert new token
    await prisma.$transaction(async (tx) => {
      const newRecord = await tx.refreshToken.create({
        data: {
          userId: tokenRecord.userId,
          tokenHash: newTokenHash,
          expiresAt: newExpiresAt
        }
      });

      await tx.refreshToken.update({
        where: { id: tokenRecord.id },
        data: {
          revokedAt: new Date(),
          replacedByTokenId: newRecord.id
        }
      });
    });

    // Issue new access token
    const { accessToken, expiresIn } = generateAccessToken(tokenRecord.userId);

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
      tokenType: 'Bearer',
      expiresIn,
      user: this.toSafeUser(tokenRecord.user)
    };
  }

  /**
   * Logs out the user by revoking the refresh token or all user sessions.
   */
  public async logout(params: { rawRefreshToken?: string; userId?: string }): Promise<{ success: boolean; message: string }> {
    try {
      if (params.rawRefreshToken) {
        const tokenHash = hashRefreshToken(params.rawRefreshToken.trim());
        await prisma.refreshToken.updateMany({
          where: {
            tokenHash,
            revokedAt: null
          },
          data: {
            revokedAt: new Date()
          }
        });
      } else if (params.userId) {
        const validatedUserId = UUIDSchema.parse(params.userId);
        await prisma.refreshToken.updateMany({
          where: {
            userId: validatedUserId,
            revokedAt: null
          },
          data: {
            revokedAt: new Date()
          }
        });
      }
    } catch (error) {
      // In offline or non-blocking logout, ensure logout succeeds for client state clearing
    }

    return {
      success: true,
      message: 'Logged out successfully'
    };
  }

  /**
   * Retrieves safe profile and progression information for the authenticated user.
   */
  public async getCurrentUser(userId: string): Promise<SafeUser> {
    const validatedUserId = UUIDSchema.parse(userId);

    const user = await prisma.user.findUnique({
      where: { id: validatedUserId },
      include: {
        profile: true,
        progression: true
      }
    });

    if (!user || user.deletedAt) {
      const error: any = new Error('User not found or account removed.');
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    return this.toSafeUser(user);
  }
}

export const authService = new AuthService();
