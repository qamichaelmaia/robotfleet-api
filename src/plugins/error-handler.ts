import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { AppError } from '../shared/errors/app-error';

export default fp(async function errorHandlerPlugin(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    const traceId = (request.headers['x-trace-id'] as string) ?? randomUUID();

    if (error instanceof AppError) {
      request.log.warn({ err: error, traceId }, 'handled application error');
      reply.status(error.status).send(error.toProblemDetails(traceId));
      return;
    }

    if (error.validation) {
      request.log.warn({ err: error, traceId }, 'validation error');
      reply.status(422).send({
        type: 'https://api.robotfleet.dev/errors/validation-error',
        title: 'Validation Error',
        status: 422,
        code: 'VALIDATION_ERROR',
        detail: error.message,
        traceId,
        errors: error.validation.map((issue) => ({
          field: issue.instancePath || issue.params?.missingProperty || 'body',
          message: issue.message ?? 'Invalid value',
        })),
      });
      return;
    }

    const statusCode = error.statusCode ?? 500;
    if (statusCode === 429) {
      reply.status(429).send({
        type: 'https://api.robotfleet.dev/errors/rate-limit-exceeded',
        title: 'Too Many Requests',
        status: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        detail: 'Rate limit exceeded. Please try again later.',
        traceId,
      });
      return;
    }

    request.log.error({ err: error, traceId }, 'unhandled error');
    reply.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).send({
      type: 'https://api.robotfleet.dev/errors/internal-server-error',
      title: 'Internal Server Error',
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      detail: 'An unexpected error occurred.',
      traceId,
    });
  });

  app.setNotFoundHandler((request, reply) => {
    const traceId = (request.headers['x-trace-id'] as string) ?? randomUUID();
    reply.status(404).send({
      type: 'https://api.robotfleet.dev/errors/route-not-found',
      title: 'Route Not Found',
      status: 404,
      code: 'ROUTE_NOT_FOUND',
      detail: `Route ${request.method} ${request.url} not found.`,
      traceId,
    });
  });
});
