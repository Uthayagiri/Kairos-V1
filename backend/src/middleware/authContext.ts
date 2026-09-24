import { FastifyReply, FastifyRequest } from 'fastify';
import { verifyAccessToken } from '../utils/security.utils.js';
import { UUIDSchema } from '../validators/schemas.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
  }
}

/**
 * Strict Production JWT Authentication Context Middleware (Phase E.4)
 * 
 * Verifies the incoming Bearer token from the standard `Authorization` header.
 * 
 * Strict Security Invariants:
 * 1. Requires `Authorization: Bearer <access-token>`.
 * 2. Rejects missing, malformed, expired, or invalid tokens with HTTP 401.
 * 3. Enforces token type = 'access' and valid UUID subject claim.
 * 4. Strictly ignores any client-supplied user IDs in headers, queries, or body parameters.
 */
export async function authContextHook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization || request.headers.Authorization;

  if (!authHeader || typeof authHeader !== 'string') {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Authorization header is missing or empty.',
      code: 'AUTH_HEADER_MISSING',
      timestamp: new Date().toISOString()
    });
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== 'bearer' || !parts[1]) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Malformed Authorization header. Required format: Bearer <token>',
      code: 'AUTH_HEADER_MALFORMED',
      timestamp: new Date().toISOString()
    });
  }

  const token = parts[1];

  try {
    const payload = verifyAccessToken(token);

    // Validate subject claim is a valid UUID
    const uuidValidation = UUIDSchema.safeParse(payload.sub);
    if (!uuidValidation.success) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid user identifier in token claims.',
        code: 'INVALID_TOKEN_SUBJECT',
        timestamp: new Date().toISOString()
      });
    }

    // Attach authoritative identity
    request.userId = uuidValidation.data;
  } catch (err: any) {
    const message = err.name === 'TokenExpiredError' 
      ? 'Access token has expired.' 
      : 'Invalid or unauthorized access token.';

    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message,
      code: err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
      timestamp: new Date().toISOString()
    });
  }
}
