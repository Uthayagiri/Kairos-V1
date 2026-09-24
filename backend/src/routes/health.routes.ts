import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { config } from '../config/env.js';
import { dbService } from '../services/db.service.js';

export const healthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * Primary Health Check Endpoint
   * Used for load balancers, uptime monitors, and frontend offline-detection probes.
   * Does NOT block on database reachability.
   */
  fastify.get('/', async (_request, reply) => {
    return reply.status(200).send({
      status: 'ok',
      service: 'kairos-backend',
      version: '1.0.0',
      environment: config.NODE_ENV,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  /**
   * Deep Database Health Check Endpoint
   * Evaluates live connectivity to PostgreSQL.
   */
  fastify.get('/db', async (_request, reply) => {
    const dbHealth = await dbService.checkHealth();
    const statusCode = dbHealth.isHealthy ? 200 : 503;

    return reply.status(statusCode).send({
      status: dbHealth.isHealthy ? 'ok' : 'degraded',
      service: 'kairos-backend',
      database: {
        engine: 'postgresql',
        connected: dbHealth.isHealthy,
        latencyMs: dbHealth.latencyMs,
        error: dbHealth.error
      },
      timestamp: new Date().toISOString()
    });
  });
};

export default healthRoutes;
