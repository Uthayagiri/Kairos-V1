import { prisma } from '../db/prisma.js';
import { CreateTaskSchema, UUIDSchema, DateStringSchema } from '../validators/schemas.js';
import { progressionService } from './progression.service.js';
import { z } from 'zod';

export class TaskService {
  public async createTask(userId: string, data: z.infer<typeof CreateTaskSchema>) {
    const validatedId = UUIDSchema.parse(userId);
    const validated = CreateTaskSchema.parse(data);

    return prisma.task.upsert({
      where: {
        userId_taskId: {
          userId: validatedId,
          taskId: validated.taskId
        }
      },
      update: {
        title: validated.title,
        category: validated.category,
        targetHp: validated.targetHp,
        startTime: validated.startTime,
        endTime: validated.endTime,
        durationMinutes: validated.durationMinutes,
        isCustom: validated.isCustom,
        isActive: true,
        deletedAt: null
      },
      create: {
        userId: validatedId,
        taskId: validated.taskId,
        title: validated.title,
        category: validated.category,
        targetHp: validated.targetHp,
        startTime: validated.startTime,
        endTime: validated.endTime,
        durationMinutes: validated.durationMinutes,
        isCustom: validated.isCustom,
        isActive: true
      }
    });
  }

  public async getUserTasks(userId: string) {
    const validatedId = UUIDSchema.parse(userId);
    return prisma.task.findMany({
      where: {
        userId: validatedId,
        isActive: true,
        deletedAt: null
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  public async deleteTask(userId: string, taskId: string) {
    const validatedId = UUIDSchema.parse(userId);
    return prisma.task.updateMany({
      where: {
        userId: validatedId,
        taskId
      },
      data: {
        isActive: false,
        deletedAt: new Date()
      }
    });
  }

  public async completeTask(
    userId: string,
    params: {
      taskId: string;
      completionDate: string;
      taskHp?: number;
      idempotencyKey: string;
    }
  ) {
    return progressionService.completeTaskAndAwardProgression(userId, params);
  }

  public async getCompletionsForDate(userId: string, date: string) {
    const validatedId = UUIDSchema.parse(userId);
    const validatedDate = DateStringSchema.parse(date);

    return prisma.taskCompletion.findMany({
      where: {
        userId: validatedId,
        completionDate: validatedDate
      }
    });
  }
}

export const taskService = new TaskService();
