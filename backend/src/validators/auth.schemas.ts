import { z } from 'zod';

/**
 * Registration Input Validation Schema
 * 
 * Invariants:
 * - Email normalized to lowercase and trimmed
 * - Strict password complexity: min 8 chars, max 128 chars, requires at least 1 letter and 1 number
 */
export const RegisterSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .pipe(
      z
        .string()
        .email('Invalid email format')
        .max(255, 'Email cannot exceed 255 characters')
    ),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters')
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: 'Password must contain at least one letter'
    })
    .refine((val) => /[0-9]/.test(val), {
      message: 'Password must contain at least one number'
    }),
  name: z.string().min(1).max(100).optional()
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

/**
 * Login Input Validation Schema
 */
export const LoginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .pipe(z.string().email('Invalid email format')),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required')
});

export type LoginInput = z.infer<typeof LoginSchema>;

/**
 * Refresh Token Payload Schema
 */
export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(10, 'Refresh token must be at least 10 characters').optional()
});

export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;

/**
 * Logout Payload Schema
 */
export const LogoutSchema = z.object({
  refreshToken: z.string().optional()
});

export type LogoutInput = z.infer<typeof LogoutSchema>;
