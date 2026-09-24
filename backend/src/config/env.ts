import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env file from backend root if present
dotenv.config();

const DEFAULT_DEV_ACCESS_SECRET = 'kairos-development-jwt-access-secret-minimum-32-chars';
const DEFAULT_DEV_REFRESH_SECRET = 'kairos-development-jwt-refresh-secret-minimum-32-chars';

const envSchema = z.object({
  PORT: z
    .string()
    .default('5000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive().max(65535)),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z
    .string()
    .optional()
    .default('postgresql://postgres:postgres@localhost:5432/kairos_db?schema=public'),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:3000'),

  // Authentication & Tokens (Phase E.4)
  JWT_ACCESS_SECRET: z
    .string()
    .optional()
    .transform((val) => val || process.env.JWT_SECRET || DEFAULT_DEV_ACCESS_SECRET),
  JWT_REFRESH_SECRET: z
    .string()
    .optional()
    .transform((val) => val || DEFAULT_DEV_REFRESH_SECRET),
  ACCESS_TOKEN_TTL: z
    .string()
    .optional()
    .transform((val) => val || process.env.JWT_EXPIRES_IN || '15m'),
  REFRESH_TOKEN_TTL: z
    .string()
    .optional()
    .transform((val) => val || process.env.JWT_REFRESH_EXPIRES_IN || '30d'),

  // Rate Limiting
  RATE_LIMIT_MAX: z
    .string()
    .default('100')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive()),
  AUTH_RATE_LIMIT_MAX: z
    .string()
    .default('20')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive())
});

export type EnvConfig = z.infer<typeof envSchema>;

function parseEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid backend environment configuration:', result.error.format());
    if (process.env.NODE_ENV === 'test') {
      return envSchema.parse({});
    }
    throw new Error('Backend environment configuration validation failed');
  }

  const parsed = result.data;

  // Ensure process.env.DATABASE_URL is explicitly set for Prisma
  if (!process.env.DATABASE_URL && parsed.DATABASE_URL) {
    process.env.DATABASE_URL = parsed.DATABASE_URL;
  }

  // Strict Production Security Invariants
  if (parsed.NODE_ENV === 'production') {
    if (
      !parsed.JWT_ACCESS_SECRET ||
      parsed.JWT_ACCESS_SECRET === DEFAULT_DEV_ACCESS_SECRET ||
      parsed.JWT_ACCESS_SECRET.length < 32
    ) {
      throw new Error(
        'SECURITY VIOLATION: Production requires a secure JWT_ACCESS_SECRET with at least 32 characters.'
      );
    }

    if (
      !parsed.JWT_REFRESH_SECRET ||
      parsed.JWT_REFRESH_SECRET === DEFAULT_DEV_REFRESH_SECRET ||
      parsed.JWT_REFRESH_SECRET.length < 32
    ) {
      throw new Error(
        'SECURITY VIOLATION: Production requires a secure JWT_REFRESH_SECRET with at least 32 characters.'
      );
    }

    if (parsed.CORS_ORIGIN.includes('*')) {
      throw new Error(
        'SECURITY VIOLATION: Wildcard CORS origin (*) is forbidden in production authentication environment.'
      );
    }
  }

  return parsed;
}

export const config = parseEnv();

