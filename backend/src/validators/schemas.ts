import { z } from 'zod';

export const UUIDSchema = z.string().uuid({ message: 'Invalid UUID format' });

export const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be in YYYY-MM-DD format' });

export const CreateUserSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }).max(128)
});

export const CreateProfileSchema = z.object({
  name: z.string().min(1).max(100).default('Kairos Voyager'),
  handle: z.string().max(50).nullable().optional(),
  bio: z.string().max(1000).nullable().optional(),
  quote: z.string().max(255).nullable().optional(),
  timezone: z.string().max(50).default('UTC'),
  circadianType: z.string().max(50).default('moderate_early'),
  avatarUrl: z.string().max(512).nullable().optional(),
  bannerTheme: z.string().max(50).nullable().optional(),
  occupation: z.string().max(50).nullable().optional(),
  monthlyFocus: z.string().max(100).nullable().optional(),
  workflow: z.string().max(50).nullable().optional(),
  energyPeak: z.string().max(50).nullable().optional(),
  companionName: z.string().max(50).nullable().optional(),
  archetype: z.string().max(50).nullable().optional(),
  voiceModel: z.string().max(50).nullable().optional(),
  pace: z.number().nullable().optional()
});

export const UpdateProfileSchema = CreateProfileSchema.partial();

export const CreateTaskSchema = z.object({
  taskId: z.string().min(1).max(64),
  title: z.string().min(1).max(255),
  category: z.string().max(50).default('daily'),
  targetHp: z.number().int().min(1).max(400).default(15),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  durationMinutes: z.number().int().min(1).max(1440).optional(),
  isCustom: z.boolean().default(true)
});

export const CompleteTaskSchema = z.object({
  taskId: z.string().min(1).max(64),
  completionDate: DateStringSchema,
  taskHp: z.number().int().min(1).max(400).default(15),
  idempotencyKey: z.string().min(8).max(128)
});

export const ClaimAchievementSchema = z.object({
  achievementId: z.string().min(1).max(64),
  rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']),
  idempotencyKey: z.string().min(8).max(128)
});

export const RecordFocusSessionSchema = z.object({
  sessionId: z.string().min(1).max(64),
  title: z.string().min(1).max(255),
  category: z.string().max(50).default('deep_work'),
  durationSeconds: z.number().int().min(1).max(86400),
  targetDurationMinutes: z.number().int().min(1).max(1440),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  flowScore: z.number().int().min(0).max(100).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(2000).optional(),
  interrupted: z.boolean().default(false)
});

export const RecordDailyReflectionSchema = z.object({
  date: DateStringSchema,
  mood: z.string().max(50).optional(),
  energyScore: z.number().int().min(1).max(10).optional(),
  focusRating: z.number().int().min(1).max(10).optional(),
  wins: z.array(z.string().max(255)).optional(),
  journalText: z.string().max(5000).optional()
});

export const CreateSquadSchema = z.object({
  name: z.string().min(1).max(100),
  handle: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9_-]+$/, { message: 'Handle must be lowercase alphanumeric with underscores/hyphens' }),
  description: z.string().max(1000).optional(),
  bannerUrl: z.string().url().max(512).optional(),
  maxMembers: z.number().int().min(2).max(50).default(10)
});

export const ContributeSquadSchema = z.object({
  squadId: UUIDSchema,
  challengeId: UUIDSchema,
  taskId: z.string().min(1).max(64),
  idempotencyKey: z.string().min(8).max(128)
});

export const SyncOperationSchema = z.object({
  id: z.string().min(8).max(128), // idempotency key
  entityType: z.enum([
    'task',
    'progression',
    'focus',
    'achievement',
    'squad',
    'reflection',
    'profile',
    'connection'
  ]),
  entityId: z.string().min(1).max(64),
  operationType: z.enum(['CREATE', 'UPDATE', 'DELETE', 'COMPLETE', 'CLAIM']),
  payload: z.record(z.any()).optional(),
  clientTimestamp: z.string().datetime().optional()
});
