import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { healthRoutes } from './health.routes.js';
import { syncRoutes } from './sync.routes.js';
import { authRoutes } from './auth.routes.js';

export const registerRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Mount /health
  await fastify.register(healthRoutes, { prefix: '/health' });

  // Mount API v1 prefix routes
  await fastify.register(
    async (v1) => {
      // /api/v1/health -> healthRoutes
      await v1.register(healthRoutes, { prefix: '/health' });

      // /api/v1/auth -> authRoutes
      await v1.register(authRoutes, { prefix: '/auth' });

      // /api/v1/sync -> syncRoutes
      await v1.register(syncRoutes, { prefix: '/sync' });
    },
    { prefix: '/api/v1' }
  );

  // Root redirect/fallback info
  fastify.get('/', async (_request, reply) => {
    return reply.status(200).send({
      message: 'Kairos Backend API Service',
      version: '1.0.0',
      docs: '/api/v1/health'
    });
  });
};

export default registerRoutes;
