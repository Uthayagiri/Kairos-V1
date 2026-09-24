import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { RegisterSchema, LoginSchema, RefreshTokenSchema, LogoutSchema } from '../validators/auth.schemas.js';
import { authService } from '../services/auth.service.js';
import { authContextHook } from '../middleware/authContext.js';
import { config } from '../config/env.js';

export const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * User Registration Endpoint
   * POST /api/v1/auth/register
   */
  fastify.post(
    '/register',
    {
      config: {
        rateLimit: {
          max: config.AUTH_RATE_LIMIT_MAX,
          timeWindow: '1 minute'
        }
      }
    },
    async (request, reply) => {
      const parseResult = RegisterSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Validation failed for registration input.',
          details: parseResult.error.format(),
          timestamp: new Date().toISOString()
        });
      }

      const session = await authService.register(parseResult.data);

      // Set secure refresh token cookie for web clients
      if ((reply as any).setCookie) {
        (reply as any).setCookie('refreshToken', session.refreshToken, {
          httpOnly: true,
          secure: config.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/api/v1/auth',
          maxAge: 30 * 24 * 60 * 60 // 30 days in seconds
        });
      }

      return reply.status(201).send(session);
    }
  );

  /**
   * User Login Endpoint
   * POST /api/v1/auth/login
   */
  fastify.post(
    '/login',
    {
      config: {
        rateLimit: {
          max: config.AUTH_RATE_LIMIT_MAX,
          timeWindow: '1 minute'
        }
      }
    },
    async (request, reply) => {
      const parseResult = LoginSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Validation failed for login credentials.',
          details: parseResult.error.format(),
          timestamp: new Date().toISOString()
        });
      }

      const session = await authService.login(parseResult.data);

      if ((reply as any).setCookie) {
        (reply as any).setCookie('refreshToken', session.refreshToken, {
          httpOnly: true,
          secure: config.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/api/v1/auth',
          maxAge: 30 * 24 * 60 * 60
        });
      }

      return reply.status(200).send(session);
    }
  );

  /**
   * Refresh Token Rotation Endpoint
   * POST /api/v1/auth/refresh
   */
  fastify.post(
    '/refresh',
    {
      config: {
        rateLimit: {
          max: config.AUTH_RATE_LIMIT_MAX,
          timeWindow: '1 minute'
        }
      }
    },
    async (request, reply) => {
      // Extract refresh token from body or cookie
      const body = request.body as any;
      const cookieToken = (request as any).cookies?.refreshToken;
      const rawToken = body?.refreshToken || cookieToken;

      if (!rawToken || typeof rawToken !== 'string' || !rawToken.trim()) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Refresh token must be provided in the request body or cookie.',
          timestamp: new Date().toISOString()
        });
      }

      const session = await authService.refresh(rawToken.trim());

      if ((reply as any).setCookie) {
        (reply as any).setCookie('refreshToken', session.refreshToken, {
          httpOnly: true,
          secure: config.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/api/v1/auth',
          maxAge: 30 * 24 * 60 * 60
        });
      }

      return reply.status(200).send(session);
    }
  );

  /**
   * User Logout Endpoint
   * POST /api/v1/auth/logout
   */
  fastify.post('/logout', async (request, reply) => {
    const body = request.body as any;
    const cookieToken = (request as any).cookies?.refreshToken;
    const rawToken = body?.refreshToken || cookieToken;

    if (rawToken) {
      await authService.logout({ rawRefreshToken: String(rawToken).trim() });
    }

    if ((reply as any).clearCookie) {
      (reply as any).clearCookie('refreshToken', { path: '/api/v1/auth' });
    }

    return reply.status(200).send({
      success: true,
      message: 'Logged out successfully.'
    });
  });

  /**
   * Get Current Authenticated User Profile
   * GET /api/v1/auth/me
   */
  fastify.get(
    '/me',
    {
      preHandler: authContextHook
    },
    async (request, reply) => {
      const user = await authService.getCurrentUser(request.userId);
      return reply.status(200).send({
        user
      });
    }
  );
};

export default authRoutes;
