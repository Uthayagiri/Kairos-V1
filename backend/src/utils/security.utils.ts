import argon2 from 'argon2';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * Hash password using Argon2id with production security parameters.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4
  });
}

/**
 * Verify a plain password against an Argon2id hash.
 * Safely handles invalid hashes without throwing or leaking timing info.
 */
export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  if (!hash || !plain) return false;
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

/**
 * Generates a high-entropy cryptographically secure random refresh token.
 */
export function generateRandomRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

/**
 * Generates a SHA-256 hash of a raw refresh token for safe database persistence.
 */
export function hashRefreshToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export interface AccessTokenPayload {
  sub: string;
  type: 'access';
  iat?: number;
  exp?: number;
}

/**
 * Issues a signed JWT Access Token with 15-minute standard TTL.
 */
export function generateAccessToken(userId: string): { accessToken: string; expiresIn: string } {
  const payload: AccessTokenPayload = {
    sub: userId,
    type: 'access'
  };

  const secret = config.JWT_ACCESS_SECRET || 'kairos-development-jwt-access-secret-minimum-32-chars';
  const token = jwt.sign(payload, secret, {
    expiresIn: config.ACCESS_TOKEN_TTL as any
  });

  return {
    accessToken: token,
    expiresIn: config.ACCESS_TOKEN_TTL || '15m'
  };
}

/**
 * Verifies and decodes a JWT Access Token.
 * Enforces subject presence, type = 'access', and signature validity.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const secret = config.JWT_ACCESS_SECRET || 'kairos-development-jwt-access-secret-minimum-32-chars';
  const decoded = jwt.verify(token, secret) as AccessTokenPayload;

  if (decoded.type !== 'access') {
    throw new Error('Invalid token type. Expected access token.');
  }

  if (!decoded.sub || typeof decoded.sub !== 'string') {
    throw new Error('Invalid token subject claim.');
  }

  return decoded;
}
