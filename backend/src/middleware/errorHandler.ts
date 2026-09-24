import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config/env.js';

export interface StandardErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  timestamp: string;
  details?: unknown;
  stack?: string;
}

/**
 * Global Error Handler for Fastify.
 * Ensures consistent JSON responses and suppresses stack traces in production.
 */
export function globalErrorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const statusCode = error.statusCode && error.statusCode >= 400 && error.statusCode < 600
    ? error.statusCode
    : 500;

  const isProduction = config.NODE_ENV === 'production';
  const errorTitle = error.name || (statusCode === 500 ? 'Internal Server Error' : 'Request Error');

  request.log.error({
    err: error,
    reqId: request.id,
    method: request.method,
    url: request.url,
    statusCode
  }, 'Request error encountered');

  const response: StandardErrorResponse = {
    statusCode,
    error: errorTitle,
    message: statusCode === 500 && isProduction
      ? 'An unexpected internal server error occurred.'
      : error.message || 'Unknown error',
    timestamp: new Date().toISOString()
  };

  // Include validation details if schema validation failed
  if (error.validation) {
    response.details = error.validation;
  }

  // Include stack traces in non-production environments
  if (!isProduction && error.stack) {
    response.stack = error.stack;
  }

  reply.status(statusCode).send(response);
}

/**
 * Global 404 Not Found Handler for Fastify.
 */
export function notFoundHandler(request: FastifyRequest, reply: FastifyReply): void {
  const response: StandardErrorResponse = {
    statusCode: 404,
    error: 'Not Found',
    message: `Route ${request.method} ${request.url} not found`,
    timestamp: new Date().toISOString()
  };

  reply.status(404).send(response);
}
