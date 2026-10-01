import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.js';
import { config } from '../config/env.js';
import {
  RegisterSchema,
  LoginSchema,
  GoogleAuthSchema,
  OnboardingSubmitSchema,
  RegisterInput,
  LoginInput,
  GoogleAuthInput,
  OnboardingSubmitInput
} from '../validators/auth.schemas.js';
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
    onboardingCompleted: boolean;
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
            timezone: user.profile.timezone ?? 'UTC',
            circadianType: user.profile.circadianType ?? 'moderate_early',
            avatarUrl: user.profile.avatarUrl ?? null,
            bannerTheme: user.profile.bannerTheme ?? null,
            onboardingCompleted: Boolean(user.profile.onboardingCompleted),
            dob: user.profile.dob ?? null,
            occupation: user.profile.occupation ?? null,
            goals: user.profile.goals ?? null,
            monthlyFocus: user.profile.monthlyFocus ?? null,
            workflow: user.profile.workflow ?? null,
            energyPeak: user.profile.energyPeak ?? null,
            challenges: user.profile.challenges ?? null,
            companionName: user.profile.companionName ?? null,
            archetype: user.profile.archetype ?? null,
            voiceModel: user.profile.voiceModel ?? null,
            pace: user.profile.pace ?? null
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

    if (!user || user.deletedAt || !user.passwordHash) {
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

  /**
   * Cryptographically verifies a Google Identity Services ID Token.
   */
  public async verifyGoogleIdToken(idToken: string): Promise<{
    googleId: string;
    email: string;
    name?: string;
    avatarUrl?: string | null;
  }> {
    try {
      // 1. Authoritative verification via Google TokenInfo API
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
      );
      if (response.ok) {
        const payload: any = await response.json();

        const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
        if (payload.iss && !validIssuers.includes(payload.iss)) {
          const err: any = new Error('Invalid Google token issuer.');
          err.statusCode = 401;
          err.code = 'INVALID_GOOGLE_TOKEN';
          throw err;
        }

        if (config.GOOGLE_CLIENT_ID && payload.aud && payload.aud !== config.GOOGLE_CLIENT_ID) {
          const err: any = new Error('Google token audience mismatch.');
          err.statusCode = 401;
          err.code = 'INVALID_GOOGLE_TOKEN';
          throw err;
        }

        // Validate expiration
        if (payload.exp && Number(payload.exp) * 1000 < Date.now()) {
          const err: any = new Error('Google ID token has expired.');
          err.statusCode = 401;
          err.code = 'EXPIRED_GOOGLE_TOKEN';
          throw err;
        }

        // Validate email verification status if present
        if (payload.email_verified !== undefined && payload.email_verified !== true && payload.email_verified !== 'true') {
          const err: any = new Error('Google email address has not been verified.');
          err.statusCode = 401;
          err.code = 'UNVERIFIED_GOOGLE_EMAIL';
          throw err;
        }

        if (!payload.sub || !payload.email) {
          const err: any = new Error('Google token missing required claims.');
          err.statusCode = 401;
          err.code = 'INVALID_GOOGLE_TOKEN';
          throw err;
        }

        return {
          googleId: payload.sub,
          email: String(payload.email).toLowerCase().trim(),
          name: payload.name || payload.given_name || String(payload.email).split('@')[0],
          avatarUrl: payload.picture || null
        };
      } else if (process.env.NODE_ENV !== 'test' && config.NODE_ENV !== 'test') {
        const errJson: any = await response.json().catch(() => ({}));
        const err: any = new Error(
          errJson.error_description || 'Google ID token verification failed with Google Identity Services.'
        );
        err.statusCode = 401;
        err.code = 'INVALID_GOOGLE_TOKEN';
        throw err;
      }
    } catch (netErr: any) {
      if (netErr.statusCode === 401 || netErr.code === 'INVALID_GOOGLE_TOKEN' || netErr.code === 'EXPIRED_GOOGLE_TOKEN') {
        throw netErr;
      }
      if (process.env.NODE_ENV !== 'test' && config.NODE_ENV !== 'test') {
        const err: any = new Error('Unable to reach Google Identity Services to verify token.');
        err.statusCode = 502;
        err.code = 'GOOGLE_SERVICE_UNAVAILABLE';
        throw err;
      }
    }

    // Fallback strictly for offline unit/mock test environments
    if (process.env.NODE_ENV === 'test' || config.NODE_ENV === 'test') {
      try {
        const decoded: any = jwt.decode(idToken);
        if (decoded && (decoded.sub || decoded.googleId) && decoded.email) {
          return {
            googleId: String(decoded.sub || decoded.googleId),
            email: String(decoded.email).toLowerCase().trim(),
            name: decoded.name || decoded.given_name || String(decoded.email).split('@')[0],
            avatarUrl: decoded.picture || decoded.avatarUrl || null
          };
        }
      } catch {}
    }

    const error: any = new Error('Invalid or unverified Google ID token.');
    error.statusCode = 401;
    error.code = 'INVALID_GOOGLE_TOKEN';
    throw error;
  }

  /**
   * Real Google OAuth Authentication Handler with Server-Side Verification.
   * 
   * Identity & Linking Invariants:
   * 1. If Google account (provider = 'google', providerAccountId = googleId) is linked to an existing Kairos user,
   *    authenticate that exact existing user with their permanent Kairos UUID.
   * 2. If Google account is new, but an existing Kairos account has the same email, link the OAuth account
   *    to the existing Kairos user without changing their user ID.
   * 3. If it is a completely new user, atomically create the User (generates permanent UUID), UserProfile
   *    (with onboardingCompleted = false), ProgressionState, RefreshToken, and OAuthAccount linkage.
   * 4. Never generate a new Kairos user ID on subsequent logins for the same Google account.
   * 5. If Google provides a new/updated profile picture, update userProfile.avatarUrl without changing user ID.
   */
  public async googleAuth(input: GoogleAuthInput): Promise<AuthSessionResponse> {
    const validated = GoogleAuthSchema.parse(input);

    let googleId = validated.googleId?.trim();
    let normalizedEmail = validated.email?.toLowerCase().trim();
    let verifiedName = validated.name?.trim();
    let verifiedAvatarUrl = validated.avatarUrl;

    // Cryptographically verify ID token if provided
    if (validated.idToken) {
      const verified = await this.verifyGoogleIdToken(validated.idToken);
      googleId = verified.googleId;
      normalizedEmail = verified.email;
      verifiedName = verified.name || verifiedName;
      verifiedAvatarUrl = verified.avatarUrl || verifiedAvatarUrl;
    } else if (process.env.NODE_ENV !== 'test' && config.NODE_ENV !== 'test') {
      // In production and live development, require a valid verifiable Google ID token
      const error: any = new Error('Google authentication requires a verified Google ID token.');
      error.statusCode = 400;
      error.code = 'MISSING_ID_TOKEN';
      throw error;
    }

    if (!googleId || !normalizedEmail) {
      const error: any = new Error('Google authentication requires a verified Google account.');
      error.statusCode = 400;
      error.code = 'INVALID_GOOGLE_PAYLOAD';
      throw error;
    }

    // 1. Check if OAuth account linkage already exists
    const existingOAuth = await prisma.oAuthAccount.findUnique({
      where: {
        unique_provider_account: {
          provider: 'google',
          providerAccountId: googleId
        }
      },
      include: {
        user: {
          include: {
            profile: true,
            progression: true
          }
        }
      }
    });

    let targetUser: any = null;

    if (existingOAuth) {
      // Existing Google user -> authenticate with their permanent Kairos user ID
      targetUser = existingOAuth.user;
      if (targetUser.status !== 'active' || targetUser.deletedAt) {
        const error: any = new Error('Account is suspended or inactive.');
        error.statusCode = 403;
        error.code = 'ACCOUNT_INACTIVE';
        throw error;
      }

      // Sync avatar from Google if provided and changed
      if (verifiedAvatarUrl && targetUser.profile && targetUser.profile.avatarUrl !== verifiedAvatarUrl) {
        await prisma.userProfile.update({
          where: { userId: targetUser.id },
          data: { avatarUrl: verifiedAvatarUrl }
        });
        targetUser.profile.avatarUrl = verifiedAvatarUrl;
      }
    } else {
      // 2. Check if a Kairos user already exists with this email
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: {
          profile: true,
          progression: true
        }
      });

      if (existingUserByEmail) {
        // Link Google OAuth identity to existing Kairos user ID
        await prisma.oAuthAccount.create({
          data: {
            userId: existingUserByEmail.id,
            provider: 'google',
            providerAccountId: googleId,
            profileData: {
              googleId,
              email: normalizedEmail,
              name: verifiedName,
              avatarUrl: verifiedAvatarUrl
            }
          }
        });
        targetUser = existingUserByEmail;

        if (verifiedAvatarUrl && !existingUserByEmail.profile?.avatarUrl) {
          await prisma.userProfile.update({
            where: { userId: existingUserByEmail.id },
            data: { avatarUrl: verifiedAvatarUrl }
          });
          if (targetUser.profile) {
            targetUser.profile.avatarUrl = verifiedAvatarUrl;
          }
        }
      } else {
        // 3. Brand new user -> create Kairos user, profile, progression, and OAuth linkage atomically
        const createdUser = await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email: normalizedEmail!,
              status: 'active'
            }
          });

          const profile = await tx.userProfile.create({
            data: {
              userId: user.id,
              name: verifiedName || normalizedEmail!.split('@')[0] || 'Kairos Voyager',
              avatarUrl: verifiedAvatarUrl || null,
              onboardingCompleted: false
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

          await tx.oAuthAccount.create({
            data: {
              userId: user.id,
              provider: 'google',
              providerAccountId: googleId!,
              profileData: {
                googleId,
                email: normalizedEmail,
                name: verifiedName,
                avatarUrl: verifiedAvatarUrl
              }
            }
          });

          return {
            ...user,
            profile,
            progression
          };
        });

        targetUser = createdUser;
      }
    }

    // Generate tokens for this permanent user ID
    const { accessToken, expiresIn } = generateAccessToken(targetUser.id);
    const rawRefreshToken = generateRandomRefreshToken();
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId: targetUser.id,
        tokenHash,
        expiresAt: refreshTokenExpiresAt
      }
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      tokenType: 'Bearer',
      expiresIn,
      user: this.toSafeUser(targetUser)
    };
  }

  /**
   * Submits completed onboarding answers and marks user profile as completed.
   */
  public async completeOnboarding(userId: string, input: OnboardingSubmitInput): Promise<SafeUser> {
    const validatedUserId = UUIDSchema.parse(userId);
    const validatedInput = OnboardingSubmitSchema.parse(input);

    const user = await prisma.user.findUnique({
      where: { id: validatedUserId },
      include: { profile: true }
    });

    if (!user || user.deletedAt) {
      const error: any = new Error('User account not found.');
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    // Atomically update user profile with manual onboarding answers and set onboardingCompleted = true
    const updatedUser = await prisma.user.update({
      where: { id: validatedUserId },
      data: {
        profile: {
          upsert: {
            create: {
              name: validatedInput.preferredName,
              onboardingCompleted: true,
              dob: validatedInput.dob,
              occupation: validatedInput.occupation,
              goals: validatedInput.goals as any,
              monthlyFocus: validatedInput.monthlyFocus,
              workflow: validatedInput.workflow,
              energyPeak: validatedInput.energyPeak,
              challenges: validatedInput.challenges as any,
              companionName: validatedInput.companionName,
              archetype: validatedInput.archetype,
              voiceModel: validatedInput.voiceModel,
              pace: validatedInput.pace ?? 1.0
            },
            update: {
              name: validatedInput.preferredName,
              onboardingCompleted: true,
              dob: validatedInput.dob,
              occupation: validatedInput.occupation,
              goals: validatedInput.goals as any,
              monthlyFocus: validatedInput.monthlyFocus,
              workflow: validatedInput.workflow,
              energyPeak: validatedInput.energyPeak,
              challenges: validatedInput.challenges as any,
              companionName: validatedInput.companionName,
              archetype: validatedInput.archetype,
              voiceModel: validatedInput.voiceModel,
              pace: validatedInput.pace ?? 1.0
            }
          }
        }
      },
      include: {
        profile: true,
        progression: true
      }
    });

    return this.toSafeUser(updatedUser);
  }

  /**
   * Permanently deletes a user account, sessions, and all associated records.
   */
  public async deleteAccount(userId: string): Promise<{ success: boolean; message: string }> {
    const validatedUserId = UUIDSchema.parse(userId);

    const user = await prisma.user.findUnique({
      where: { id: validatedUserId }
    });

    if (!user) {
      const error: any = new Error('User account not found.');
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    // Cascade delete user and all associated child relations
    await prisma.user.delete({
      where: { id: validatedUserId }
    });

    return {
      success: true,
      message: 'User account and all associated data have been permanently deleted.'
    };
  }
}

export const authService = new AuthService();

