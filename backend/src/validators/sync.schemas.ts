import { z } from 'zod';
import { UUIDSchema, DateStringSchema } from './schemas.js';

export const SyncOperationTypeEnum = z.enum([
  'TASK_CREATED',
  'TASK_UPDATED',
  'TASK_DELETED',
  'TASK_COMPLETED',
  'TASK_UNCOMPLETED',
  'ACHIEVEMENT_CLAIMED',
  'FOCUS_SESSION_RECORDED',
  'DAILY_REFLECTION_UPSERTED',
  'PROFILE_UPDATED',
  'SQUAD_CHALLENGE_CONTRIBUTION'
]);

export type SyncOperationType = z.infer<typeof SyncOperationTypeEnum>;

// Specific Payload Validation Schemas
export const TaskCreatedPayloadSchema = z.object({
  taskId: z.string().min(1).max(64),
  title: z.string().min(1).max(255),
  category: z.string().max(50).default('daily'),
  targetHp: z.number().int().min(1).max(400).default(15),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  durationMinutes: z.number().int().min(1).max(1440).optional(),
  isCustom: z.boolean().default(true)
});

export const TaskUpdatedPayloadSchema = z.object({
  taskId: z.string().min(1).max(64),
  title: z.string().min(1).max(255).optional(),
  category: z.string().max(50).optional(),
  targetHp: z.number().int().min(1).max(400).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  durationMinutes: z.number().int().min(1).max(1440).optional()
});

export const TaskDeletedPayloadSchema = z.object({
  taskId: z.string().min(1).max(64)
});

export const TaskCompletedPayloadSchema = z.object({
  taskId: z.string().min(1).max(64),
  completionDate: DateStringSchema,
  taskHp: z.number().int().min(1).max(400).default(15)
  // Protected invariant: Any client-supplied 'earnedXp' or 'totalXp' is ignored and recalculation is done server-side
});

export const TaskUncompletedPayloadSchema = z.object({
  taskId: z.string().min(1).max(64),
  completionDate: DateStringSchema
});

export const AchievementClaimedPayloadSchema = z.object({
  achievementId: z.string().min(1).max(64),
  rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'])
});

export const FocusSessionRecordedPayloadSchema = z.object({
  sessionId: z.string().min(1).max(64),
  title: z.string().min(1).max(255),
  category: z.string().max(50).default('deep_work'),
  durationSeconds: z.number().int().min(1).max(86400),
  targetDurationMinutes: z.number().int().min(1).max(1440),
  startedAt: z.string().datetime({ message: 'startedAt must be an ISO datetime string' }),
  completedAt: z.string().datetime({ message: 'completedAt must be an ISO datetime string' }),
  flowScore: z.number().int().min(0).max(100).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(2000).optional(),
  interrupted: z.boolean().default(false)
});

export const DailyReflectionUpsertedPayloadSchema = z.object({
  date: DateStringSchema,
  mood: z.string().max(50).optional(),
  energyScore: z.number().int().min(1).max(10).optional(),
  focusRating: z.number().int().min(1).max(10).optional(),
  wins: z.array(z.string().max(255)).optional(),
  journalText: z.string().max(5000).optional()
});

export const ProfileUpdatedPayloadSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  handle: z.string().max(50).optional(),
  bio: z.string().max(1000).optional(),
  quote: z.string().max(255).optional(),
  timezone: z.string().max(50).optional(),
  circadianType: z.string().max(50).optional(),
  avatarUrl: z.string().url().max(512).optional(),
  bannerTheme: z.string().max(50).optional()
});

export const SquadChallengeContributionPayloadSchema = z.object({
  squadId: UUIDSchema,
  challengeId: UUIDSchema,
  taskId: z.string().min(1).max(64)
});

// Single Sync Operation Item Schema
export const SyncOperationItemSchema = z.object({
  operationId: UUIDSchema,
  sequence: z.number().int().positive({ message: 'Sequence must be a positive integer (> 0)' }),
  type: SyncOperationTypeEnum,
  occurredAt: z.string().datetime({ message: 'occurredAt must be a valid ISO 8601 datetime' }),
  payload: z.record(z.any()).refine((val) => val !== null && typeof val === 'object', {
    message: 'Payload must be a non-null JSON object'
  })
});

export type SyncOperationItem = z.infer<typeof SyncOperationItemSchema>;

export const MAX_OPERATIONS_PER_BATCH = 100;

// Batch Request Schema
export const SyncBatchRequestSchema = z.object({
  deviceId: z.string().min(1, { message: 'deviceId is required' }).max(128),
  sinceVersion: z.number().int().nonnegative().optional(),
  operations: z
    .array(SyncOperationItemSchema)
    .min(1, { message: 'Batch must contain at least 1 operation' })
    .max(MAX_OPERATIONS_PER_BATCH, {
      message: `Batch size exceeds maximum limit of ${MAX_OPERATIONS_PER_BATCH} operations`
    })
});

export type SyncBatchRequest = z.infer<typeof SyncBatchRequestSchema>;
