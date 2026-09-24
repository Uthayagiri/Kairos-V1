import { prisma } from '../db/prisma.js';
import { CreateUserSchema, UUIDSchema } from '../validators/schemas.js';
import { hashPassword } from '../utils/security.utils.js';
import { z } from 'zod';

export class UserService {
  public async createUser(data: z.infer<typeof CreateUserSchema>) {
    const validated = CreateUserSchema.parse(data);
    const passwordHash = await hashPassword(validated.password);

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: validated.email.toLowerCase().trim(),
          passwordHash,
          status: 'active'
        }
      });

      // Automatically create baseline user profile and progression state
      await tx.userProfile.create({
        data: {
          userId: user.id,
          name: validated.email.split('@')[0] || 'Kairos Voyager'
        }
      });

      await tx.progressionState.create({
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

      return user;
    });
  }

  public async getUserById(userId: string) {
    const validatedId = UUIDSchema.parse(userId);
    return prisma.user.findUnique({
      where: { id: validatedId },
      include: {
        profile: true,
        progression: true
      }
    });
  }

  public async getUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        profile: true,
        progression: true
      }
    });
  }

  public async deleteUser(userId: string) {
    const validatedId = UUIDSchema.parse(userId);
    return prisma.user.delete({
      where: { id: validatedId }
    });
  }
}

export const userService = new UserService();
