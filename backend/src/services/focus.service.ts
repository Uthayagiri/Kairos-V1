import { prisma } from '../db/prisma.js';
import { UUIDSchema, RecordFocusSessionSchema } from '../validators/schemas.js';
import { z } from 'zod';

export class FocusService {
  public async recordFocusSession(userId: string, data: z.infer<typeof RecordFocusSessionSchema>) {
    const validatedId = UUIDSchema.parse(userId);
    const validated = RecordFocusSessionSchema.parse(data);

    return prisma.focusSession.upsert({
      where: {
        unique_user_session: {
          userId: validatedId,
          sessionId: validated.sessionId
        }
      },
      update: {
        title: validated.title,
        category: validated.category,
        durationSeconds: validated.durationSeconds,
        targetDurationMinutes: validated.targetDurationMinutes,
        flowScore: validated.flowScore,
        rating: validated.rating,
        notes: validated.notes,
        interrupted: validated.interrupted
      },
      create: {
        userId: validatedId,
        sessionId: validated.sessionId,
        title: validated.title,
        category: validated.category,
        durationSeconds: validated.durationSeconds,
        targetDurationMinutes: validated.targetDurationMinutes,
        startedAt: new Date(validated.startedAt),
        completedAt: new Date(validated.completedAt),
        flowScore: validated.flowScore,
        rating: validated.rating,
        notes: validated.notes,
        interrupted: validated.interrupted
      }
    });
  }

  public async getUserFocusSessions(userId: string, limit = 50) {
    const validatedId = UUIDSchema.parse(userId);
    return prisma.focusSession.findMany({
      where: { userId: validatedId },
      orderBy: { completedAt: 'desc' },
      take: limit
    });
  }
}

export const focusService = new FocusService();
