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
  refreshToken: z.string().min(10, 'Refresh token must be at least 10 characters').optional()
});

export type LogoutInput = z.infer<typeof LogoutSchema>;

/**
 * Google OAuth Authentication Schema
 */
export const GoogleAuthSchema = z
  .object({
    idToken: z.string().optional(),
    googleId: z.string().trim().min(1).optional(),
    email: z.string().trim().toLowerCase().pipe(z.string().email('Invalid email format')).optional(),
    name: z.string().min(1).max(100).optional(),
    avatarUrl: z.string().max(512).optional().nullable(),
    givenName: z.string().max(50).optional(),
    familyName: z.string().max(50).optional()
  })
  .refine((data) => Boolean(data.idToken || (data.googleId && data.email)), {
    message: 'Google authentication requires a valid idToken or verified Google credentials.'
  });

export type GoogleAuthInput = z.infer<typeof GoogleAuthSchema>;

/**
 * Onboarding Question Validation Schema
 * 
 * Strict Invariants:
 * - Empty string, null, undefined, or empty arrays are rejected.
 * - Every required field must be explicitly present and validated.
 */
export const OnboardingSubmitSchema = z.object({
  preferredName: z.string().trim().min(1, 'Preferred name is required').max(100),
  dob: z
    .string({ required_error: 'Date of birth is required' })
    .trim()
    .min(1, 'Date of birth is required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format'),
  occupation: z.string().trim().min(1, 'Occupation is required'),
  goals: z.array(z.string().min(1)).min(1, 'At least one goal must be selected'),
  monthlyFocus: z.string().trim().min(1, 'Monthly focus is required'),
  workflow: z.string().trim().min(1, 'Daily workflow is required'),
  energyPeak: z.string().trim().min(1, 'Energy peak is required'),
  challenges: z.array(z.string().min(1)).min(1, 'At least one challenge must be selected'),
  companionName: z.string().trim().min(1, 'Companion name is required').max(50),
  archetype: z.string().trim().min(1, 'Companion archetype is required'),
  voiceModel: z.string().trim().min(1, 'Voice model is required'),
  pace: z.number().min(0.5).max(2.0).optional()
});

export type OnboardingSubmitInput = z.infer<typeof OnboardingSubmitSchema>;

