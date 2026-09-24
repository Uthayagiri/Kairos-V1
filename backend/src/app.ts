import fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { config } from './config/env.js';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { registerRoutes } from './routes/index.js';

/**
 * Builds and configures the Fastify application instance.
 */
export async function buildApp(options: FastifyServerOptions = {}): Promise<FastifyInstance> {
  const isDev = config.NODE_ENV === 'development';
  const isTest = config.NODE_ENV === 'test';

  const defaultLoggerConfig = isTest
    ? false
    : {
        level: isDev ? 'debug' : 'info',
        transport: isDev
          ? undefined // Default pretty logger or standard stream
          : undefined,
        serializers: {
          req(req: any) {
            return {
              method: req.method,
              url: req.url,
              headers: {
                host: req.headers.host,
                'user-agent': req.headers['user-agent']
              }
            };
          }
        }
      };

  const app = fastify({
    logger: options.logger ?? defaultLoggerConfig,
    ...options
  });

  // Register Sensible for useful HTTP status helpers
  await app.register(sensible);

  // Register Cookie support
  await app.register(cookie);

  // Register Rate Limiting
  await app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: '1 minute',
    allowList: isTest ? ['127.0.0.1', 'localhost'] : []
  });

  // Configure CORS
  const allowedOrigins = config.CORS_ORIGIN.split(',').map((o) => o.trim());
  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*') || isDev) {
        return cb(null, true);
      }
      return cb(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true
  });

  // Centralized Error Handling
  app.setErrorHandler(globalErrorHandler);
  app.setNotFoundHandler(notFoundHandler);

  // Register all routes
  await app.register(registerRoutes);

  return app;
}

export default buildApp;
