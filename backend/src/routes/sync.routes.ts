import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { SyncBatchRequestSchema } from '../validators/sync.schemas.js';
import { syncService } from '../services/sync.service.js';
import { authContextHook } from '../middleware/authContext.js';

export const syncRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * Lightweight Sync Reachability & Connectivity Status Endpoint
   * Used for offline/online state detection by frontend and background pingers.
   */
  fastify.get('/status', async (_request, reply) => {
    return reply.status(200).send({
      online: true,
      serverTime: new Date().toISOString(),
      apiVersion: 'v1'
    });
  });

  /**
   * Primary Batch Synchronization Endpoint
   * Ingests ordered client mutations, executes them idempotently, and returns authoritative snapshots.
   */
  fastify.post(
    '/batch',
    {
      preHandler: authContextHook
    },
    async (request, reply) => {
      // 1. Validate complete request payload using Zod
      const parseResult = SyncBatchRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Malformed sync batch request structure or validation failure',
          details: parseResult.error.format(),
          timestamp: new Date().toISOString()
        });
      }

      // 2. Process batch through the SyncService
      const batchResponse = await syncService.processBatch(request.userId, parseResult.data);

      return reply.status(200).send(batchResponse);
    }
  );

  /**
   * Authoritative State Pull Endpoint
   * Returns complete application state snapshot for the authenticated user from PostgreSQL.
   */
  fastify.get(
    '/state',
    {
      preHandler: authContextHook
    },
    async (request, reply) => {
      const state = await syncService.getUserFullState(request.userId);
      return reply.status(200).send(state);
    }
  );
};

export default syncRoutes;
