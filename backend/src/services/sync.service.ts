import { prisma } from '../db/prisma.js';
import { UUIDSchema } from '../validators/schemas.js';
import {
  SyncBatchRequest,
  SyncOperationItem,
  TaskCreatedPayloadSchema,
  TaskUpdatedPayloadSchema,
  TaskDeletedPayloadSchema,
  TaskCompletedPayloadSchema,
  TaskUncompletedPayloadSchema,
  AchievementClaimedPayloadSchema,
  FocusSessionRecordedPayloadSchema,
  DailyReflectionUpsertedPayloadSchema,
  ProfileUpdatedPayloadSchema,
  SquadChallengeContributionPayloadSchema
} from '../validators/sync.schemas.js';
import { progressionService } from './progression.service.js';
import { taskService } from './task.service.js';
import { profileService } from './profile.service.js';
import { focusService } from './focus.service.js';
import { squadService } from './squad.service.js';

export type SyncResultStatus = 'APPLIED' | 'ALREADY_APPLIED' | 'REJECTED' | 'CONFLICT';
export type SyncResultCode =
  | 'OK'
  | 'ALREADY_PROCESSED'
  | 'INVALID_OPERATION'
  | 'ENTITY_NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT';

export interface SyncOperationResult {
  operationId: string;
  status: SyncResultStatus;
  code: SyncResultCode;
  error?: string;
}

export interface SyncBatchResponse {
  success: boolean;
  serverTime: string;
  cursorVersion: number;
  results: SyncOperationResult[];
  snapshots: {
    progression?: {
      totalXp: number;
      xpRemainder: number;
      level: number;
      todayHp: number;
      lifetimeHp: number;
      streakCount: number;
      lastActiveDate: string;
    } | null;
    tasks?: any[] | null;
    achievements?: any[] | null;
  };
}

export class SyncService {
  /**
   * Processes a batch of sync operations in sequence with idempotent deduplication.
   * 
   * Invariants:
   * 1. Partial Success: Failure of one operation does not reject the entire batch.
   * 2. Idempotency: Duplicate operationIds return ALREADY_APPLIED without re-executing.
   * 3. Server Authority: Progression rewards are calculated server-side; client XP/HP is ignored.
   */
  public async processBatch(userId: string, batch: SyncBatchRequest): Promise<SyncBatchResponse> {
    const validatedUserId = UUIDSchema.parse(userId);
    const results: SyncOperationResult[] = [];

    let progressionTouched = false;
    let tasksTouched = false;
    let achievementsTouched = false;

    // Sort operations by client sequence to ensure deterministic execution order
    const sortedOperations = [...batch.operations].sort((a, b) => a.sequence - b.sequence);

    for (const op of sortedOperations) {
      try {
        // 1. Check Idempotency Ledger: has this operationId already been processed?
        const existingSyncOp = await prisma.syncOperation.findUnique({
          where: {
            unique_user_sync_op: {
              userId: validatedUserId,
              idempotencyKey: op.operationId
            }
          }
        });

        if (existingSyncOp) {
          results.push({
            operationId: op.operationId,
            status: 'ALREADY_APPLIED',
            code: 'ALREADY_PROCESSED'
          });
          continue;
        }

        // 2. Dispatch to dedicated domain handler
        const dispatchResult = await this.executeOperation(validatedUserId, op);

        if (dispatchResult.status === 'APPLIED') {
          if (['TASK_COMPLETED', 'TASK_UNCOMPLETED', 'ACHIEVEMENT_CLAIMED'].includes(op.type)) {
            progressionTouched = true;
          }
          if (['TASK_CREATED', 'TASK_UPDATED', 'TASK_DELETED'].includes(op.type)) {
            tasksTouched = true;
          }
          if (op.type === 'ACHIEVEMENT_CLAIMED') {
            achievementsTouched = true;
          }

          // Record in SyncOperation Ledger
          await prisma.syncOperation.create({
            data: {
              userId: validatedUserId,
              idempotencyKey: op.operationId,
              entityType: this.getEntityTypeForOperation(op.type),
              entityId: this.extractEntityId(op),
              operationType: op.type,
              payload: op.payload,
              status: 'PROCESSED',
              clientTimestamp: new Date(op.occurredAt)
            }
          });
        }

        results.push(dispatchResult);
      } catch (err) {
        results.push({
          operationId: op.operationId,
          status: 'REJECTED',
          code: 'INVALID_OPERATION',
          error: (err as Error).message || 'Operation execution failed'
        });
      }
    }

    // 3. Assemble Authoritative Snapshots for changed domains
    let progressionSnapshot = null;
    let tasksSnapshot = null;
    let achievementsSnapshot = null;

    if (progressionTouched) {
      const state = await progressionService.getProgression(validatedUserId);
      progressionSnapshot = {
        totalXp: state.totalXp,
        xpRemainder: state.xpRemainder,
        level: state.level,
        todayHp: state.todayHp,
        lifetimeHp: state.lifetimeHp,
        streakCount: state.streakCount,
        lastActiveDate: state.lastActiveDate
      };
    }

    if (tasksTouched) {
      tasksSnapshot = await taskService.getUserTasks(validatedUserId);
    }

    if (achievementsTouched) {
      achievementsSnapshot = await prisma.achievementProgress.findMany({
        where: { userId: validatedUserId }
      });
    }

    // Get latest progression version as cursor
    const latestProgression = await prisma.progressionState.findUnique({
      where: { userId: validatedUserId },
      select: { version: true }
    });
    const cursorVersion = latestProgression?.version ? Number(latestProgression.version) : 1;

    return {
      success: true,
      serverTime: new Date().toISOString(),
      cursorVersion,
      results,
      snapshots: {
        progression: progressionSnapshot,
        tasks: tasksSnapshot,
        achievements: achievementsSnapshot
      }
    };
  }

  /**
   * Dispatches and validates individual operation payloads against the domain services.
   */
  private async executeOperation(userId: string, op: SyncOperationItem): Promise<SyncOperationResult> {
    switch (op.type) {
      case 'TASK_CREATED': {
        const payload = TaskCreatedPayloadSchema.safeParse(op.payload);
        if (!payload.success) {
          return {
            operationId: op.operationId,
            status: 'REJECTED',
            code: 'VALIDATION_ERROR',
            error: payload.error.message
          };
        }
        await taskService.createTask(userId, payload.data);
        return { operationId: op.operationId, status: 'APPLIED', code: 'OK' };
      }

      case 'TASK_UPDATED': {
        const payload = TaskUpdatedPayloadSchema.safeParse(op.payload);
        if (!payload.success) {
          return {
            operationId: op.operationId,
            status: 'REJECTED',
            code: 'VALIDATION_ERROR',
            error: payload.error.message
          };
        }
        const existing = await prisma.task.findUnique({
          where: {
            userId_taskId: {
              userId,
              taskId: payload.data.taskId
            }
          }
        });
        if (!existing) {
          return {
            operationId: op.operationId,
            status: 'REJECTED',
            code: 'ENTITY_NOT_FOUND',
            error: `Task with id '${payload.data.taskId}' not found`
          };
        }

        // Conflict check: Field-level LWW
        const opTime = new Date(op.occurredAt).getTime();
        const serverUpdatedTime = existing.updatedAt.getTime();
        if (opTime < serverUpdatedTime) {
          return {
            operationId: op.operationId,
            status: 'CONFLICT',
            code: 'CONFLICT',
            error: 'Server has newer updates for this task'
          };
        }

        await taskService.createTask(userId, {
          taskId: payload.data.taskId,
          title: payload.data.title ?? existing.title,
          category: payload.data.category ?? existing.category,
          targetHp: payload.data.targetHp ?? existing.targetHp,
          startTime: payload.data.startTime ?? existing.startTime ?? undefined,
          endTime: payload.data.endTime ?? existing.endTime ?? undefined,
          durationMinutes: payload.data.durationMinutes ?? existing.durationMinutes ?? undefined,
          isCustom: existing.isCustom
        });

        return { operationId: op.operationId, status: 'APPLIED', code: 'OK' };
      }

      case 'TASK_DELETED': {
        const payload = TaskDeletedPayloadSchema.safeParse(op.payload);
        if (!payload.success) {
          return {
            operationId: op.operationId,
            status: 'REJECTED',
            code: 'VALIDATION_ERROR',
            error: payload.error.message
          };
        }
        await taskService.deleteTask(userId, payload.data.taskId);
        return { operationId: op.operationId, status: 'APPLIED', code: 'OK' };
      }

      case 'TASK_COMPLETED': {
        const payload = TaskCompletedPayloadSchema.safeParse(op.payload);
        if (!payload.success) {
          return {
            operationId: op.operationId,
            status: 'REJECTED',
            code: 'VALIDATION_ERROR',
            error: payload.error.message
          };
        }

        const res = await progressionService.completeTaskAndAwardProgression(userId, {
          taskId: payload.data.taskId,
          completionDate: payload.data.completionDate,
          taskHp: payload.data.taskHp,
          idempotencyKey: op.operationId
        });

        if (res.isDuplicate) {
          return {
            operationId: op.operationId,
            status: 'ALREADY_APPLIED',
            code: 'ALREADY_PROCESSED'
          };
        }

        return { operationId: op.operationId, status: 'APPLIED', code: 'OK' };
      }

      case 'TASK_UNCOMPLETED': {
        const payload = TaskUncompletedPayloadSchema.safeParse(op.payload);
        if (!payload.success) {
          return {
            operationId: op.operationId,
            status: 'REJECTED',
            code: 'VALIDATION_ERROR',
            error: payload.error.message
          };
        }
        // Soft delete/remove completion record
        await prisma.taskCompletion.deleteMany({
          where: {
            userId,
            taskId: payload.data.taskId,
            completionDate: payload.data.completionDate
          }
        });
        return { operationId: op.operationId, status: 'APPLIED', code: 'OK' };
      }

      case 'ACHIEVEMENT_CLAIMED': {
        const payload = AchievementClaimedPayloadSchema.safeParse(op.payload);
        if (!payload.success) {
          return {
            operationId: op.operationId,
            status: 'REJECTED',
            code: 'VALIDATION_ERROR',
            error: payload.error.message
          };
        }

        const res = await progressionService.claimAchievementReward(userId, {
          achievementId: payload.data.achievementId,
          rarity: payload.data.rarity,
          idempotencyKey: op.operationId
        });

        if (res.status === 'ALREADY_CLAIMED') {
          return {
            operationId: op.operationId,
            status: 'ALREADY_APPLIED',
            code: 'ALREADY_PROCESSED'
          };
        }

        return { operationId: op.operationId, status: 'APPLIED', code: 'OK' };
      }

      case 'FOCUS_SESSION_RECORDED': {
        const payload = FocusSessionRecordedPayloadSchema.safeParse(op.payload);
        if (!payload.success) {
          return {
            operationId: op.operationId,
            status: 'REJECTED',
            code: 'VALIDATION_ERROR',
            error: payload.error.message
          };
        }
        await focusService.recordFocusSession(userId, payload.data);
        return { operationId: op.operationId, status: 'APPLIED', code: 'OK' };
      }

      case 'DAILY_REFLECTION_UPSERTED': {
        const payload = DailyReflectionUpsertedPayloadSchema.safeParse(op.payload);
        if (!payload.success) {
          return {
            operationId: op.operationId,
            status: 'REJECTED',
            code: 'VALIDATION_ERROR',
            error: payload.error.message
          };
        }
        await prisma.dailyReflection.upsert({
          where: {
            unique_user_reflection_date: {
              userId,
              date: payload.data.date
            }
          },
          update: {
            mood: payload.data.mood,
            energyScore: payload.data.energyScore,
            focusRating: payload.data.focusRating,
            wins: payload.data.wins,
            journalText: payload.data.journalText
          },
          create: {
            userId,
            date: payload.data.date,
            mood: payload.data.mood,
            energyScore: payload.data.energyScore,
            focusRating: payload.data.focusRating,
            wins: payload.data.wins,
            journalText: payload.data.journalText
          }
        });
        return { operationId: op.operationId, status: 'APPLIED', code: 'OK' };
      }

      case 'PROFILE_UPDATED': {
        const payload = ProfileUpdatedPayloadSchema.safeParse(op.payload);
        if (!payload.success) {
          return {
            operationId: op.operationId,
            status: 'REJECTED',
            code: 'VALIDATION_ERROR',
            error: payload.error.message
          };
        }
        await profileService.updateProfile(userId, payload.data);
        return { operationId: op.operationId, status: 'APPLIED', code: 'OK' };
      }

      case 'SQUAD_CHALLENGE_CONTRIBUTION': {
        const payload = SquadChallengeContributionPayloadSchema.safeParse(op.payload);
        if (!payload.success) {
          return {
            operationId: op.operationId,
            status: 'REJECTED',
            code: 'VALIDATION_ERROR',
            error: payload.error.message
          };
        }
        await squadService.contributeToChallenge(userId, {
          squadId: payload.data.squadId,
          challengeId: payload.data.challengeId,
          taskId: payload.data.taskId,
          idempotencyKey: op.operationId
        });
        return { operationId: op.operationId, status: 'APPLIED', code: 'OK' };
      }

      default:
        return {
          operationId: op.operationId,
          status: 'REJECTED',
          code: 'INVALID_OPERATION',
          error: `Unsupported operation type '${(op as any).type}'`
        };
    }
  }

  /**
   * Retrieves the comprehensive authoritative application state snapshot for an authenticated user.
   */
  public async getUserFullState(userId: string) {
    const validatedUserId = UUIDSchema.parse(userId);
    const today = new Date().toISOString().split('T')[0];

    const [progression, tasks, achievements, profile, reflections, focusSessions, todayCompletions, recentCompletions] = await Promise.all([
      progressionService.getProgression(validatedUserId),
      taskService.getUserTasks(validatedUserId),
      prisma.achievementProgress.findMany({
        where: { userId: validatedUserId }
      }),
      profileService.getProfile(validatedUserId),
      prisma.dailyReflection.findMany({
        where: { userId: validatedUserId },
        orderBy: { date: 'desc' },
        take: 30
      }),
      prisma.focusSession.findMany({
        where: { userId: validatedUserId },
        orderBy: { completedAt: 'desc' },
        take: 50
      }),
      prisma.taskCompletion.findMany({
        where: {
          userId: validatedUserId,
          completionDate: today
        }
      }),
      prisma.taskCompletion.findMany({
        where: { userId: validatedUserId },
        orderBy: { completedAt: 'desc' },
        take: 100
      })
    ]);

    const completedTaskIdsToday = todayCompletions.map((c) => c.taskId);
    const taskHistory = recentCompletions.map((c) => ({
      taskId: c.taskId,
      taskTitle: c.taskId,
      hpAwarded: c.earnedHp,
      xpAwarded: c.earnedXp,
      completedAt: c.completedAt.toISOString(),
      date: c.completionDate
    }));

    const cursorVersion = progression?.version ? Number(progression.version) : 1;

    return {
      success: true,
      serverTime: new Date().toISOString(),
      cursorVersion,
      snapshots: {
        progression: {
          totalXp: progression.totalXp,
          xpRemainder: progression.xpRemainder,
          level: progression.level,
          todayHp: progression.todayHp,
          lifetimeHp: progression.lifetimeHp,
          streakCount: progression.streakCount,
          lastActiveDate: progression.lastActiveDate,
          completedTaskIdsToday,
          taskHistory
        },
        tasks,
        achievements,
        profile,
        reflections,
        focusSessions
      }
    };
  }

  private getEntityTypeForOperation(type: string): string {
    if (type.startsWith('TASK_')) return 'task';
    if (type.startsWith('ACHIEVEMENT_')) return 'achievement';
    if (type.startsWith('FOCUS_')) return 'focus';
    if (type.startsWith('DAILY_')) return 'reflection';
    if (type.startsWith('PROFILE_')) return 'profile';
    if (type.startsWith('SQUAD_')) return 'squad';
    return 'generic';
  }

  private extractEntityId(op: SyncOperationItem): string {
    if (op.payload?.taskId) return String(op.payload.taskId);
    if (op.payload?.achievementId) return String(op.payload.achievementId);
    if (op.payload?.sessionId) return String(op.payload.sessionId);
    if (op.payload?.date) return String(op.payload.date);
    if (op.payload?.squadId) return String(op.payload.squadId);
    return op.operationId;
  }
}

export const syncService = new SyncService();
