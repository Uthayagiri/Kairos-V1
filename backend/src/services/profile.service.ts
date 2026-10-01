import { prisma } from '../db/prisma.js';
import { UUIDSchema, UpdateProfileSchema } from '../validators/schemas.js';
import { z } from 'zod';

export class ProfileService {
  public async getProfile(userId: string) {
    const validatedId = UUIDSchema.parse(userId);
    return prisma.userProfile.findUnique({
      where: { userId: validatedId }
    });
  }

  public async updateProfile(userId: string, data: z.infer<typeof UpdateProfileSchema>) {
    const validatedId = UUIDSchema.parse(userId);
    const validatedData = UpdateProfileSchema.parse(data);

    if (validatedData.handle) {
      const normalizedHandle = validatedData.handle.trim();
      const existingProfile = await prisma.userProfile.findFirst({
        where: {
          handle: { equals: normalizedHandle, mode: 'insensitive' },
          userId: { not: validatedId }
        }
      });
      if (existingProfile) {
        const error: any = new Error(`Handle '${normalizedHandle}' is already taken by another user.`);
        error.statusCode = 409;
        error.code = 'HANDLE_ALREADY_TAKEN';
        throw error;
      }
    }

    return prisma.userProfile.upsert({
      where: { userId: validatedId },
      update: validatedData,
      create: {
        userId: validatedId,
        name: validatedData.name || 'Kairos Voyager',
        ...validatedData
      }
    });
  }
}

export const profileService = new ProfileService();
