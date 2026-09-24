import { prisma } from '../db/prisma.js';
import { UUIDSchema, CreateSquadSchema, ContributeSquadSchema } from '../validators/schemas.js';
import { z } from 'zod';

export class SquadService {
  public async createSquad(ownerId: string, data: z.infer<typeof CreateSquadSchema>) {
    const validatedOwnerId = UUIDSchema.parse(ownerId);
    const validated = CreateSquadSchema.parse(data);

    return prisma.$transaction(async (tx) => {
      const squad = await tx.squad.create({
        data: {
          name: validated.name,
          handle: validated.handle.toLowerCase(),
          description: validated.description,
          bannerUrl: validated.bannerUrl,
          maxMembers: validated.maxMembers,
          memberCount: 1
        }
      });

      // Add creator as owner
      await tx.squadMember.create({
        data: {
          squadId: squad.id,
          userId: validatedOwnerId,
          role: 'owner'
        }
      });

      return squad;
    });
  }

  public async getSquad(squadId: string) {
    const validatedId = UUIDSchema.parse(squadId);
    return prisma.squad.findUnique({
      where: { id: validatedId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                profile: true
              }
            }
          }
        },
        challenges: true
      }
    });
  }

  /**
   * Records a member's task contribution to an active squad challenge.
   * 
   * Strict Invariants:
   * - Squad contributions advance squad challenge count and member contribution points.
   * - Strictly awards 0 XP and 0 HP to personal user progression.
   */
  public async contributeToChallenge(
    userId: string,
    params: z.infer<typeof ContributeSquadSchema>
  ) {
    const validatedUserId = UUIDSchema.parse(userId);
    const validated = ContributeSquadSchema.parse(params);

    return prisma.$transaction(async (tx) => {
      // 1. Verify membership
      const membership = await tx.squadMember.findUnique({
        where: {
          unique_squad_member: {
            squadId: validated.squadId,
            userId: validatedUserId
          }
        }
      });

      if (!membership) {
        throw new Error('User is not a member of this squad');
      }

      // 2. Increment Challenge
      const challenge = await tx.squadChallenge.findUnique({
        where: { id: validated.challengeId }
      });

      if (!challenge) {
        throw new Error('Squad challenge not found');
      }

      const newCount = challenge.currentCount + 1;
      const isCompleted = newCount >= challenge.targetCount;

      const updatedChallenge = await tx.squadChallenge.update({
        where: { id: validated.challengeId },
        data: {
          currentCount: newCount,
          isCompleted
        }
      });

      // 3. Increment Member contribution points
      await tx.squadMember.update({
        where: { id: membership.id },
        data: {
          contributionPoints: { increment: 1 }
        }
      });

      // Return squad contribution result (Notice: zero personal XP/HP awarded!)
      return {
        success: true,
        challengeId: updatedChallenge.id,
        currentCount: updatedChallenge.currentCount,
        targetCount: updatedChallenge.targetCount,
        isCompleted: updatedChallenge.isCompleted,
        awardedPersonalXp: 0, // Protected Invariant
        awardedPersonalHp: 0  // Protected Invariant
      };
    });
  }
}

export const squadService = new SquadService();
