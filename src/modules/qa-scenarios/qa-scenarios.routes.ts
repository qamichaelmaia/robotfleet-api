import { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { Errors } from '../../shared/errors/app-error';

/**
 * QA lab endpoints: intentionally simulate slow, failing and rate-limited responses.
 * These are laboratory resources, not part of the real business domain.
 */
export default async function qaScenariosRoutes(app: FastifyInstance) {
  app.get(
    '/health',
    {
      schema: {
        tags: ['QA Scenarios'],
        summary: '[Lab] Always returns a healthy response',
        response: { 200: Type.Object({ status: Type.String() }) },
      },
    },
    async (_request, reply) => {
      reply.send({ status: 'ok' });
    },
  );

  app.get(
    '/delay',
    {
      schema: {
        tags: ['QA Scenarios'],
        summary: '[Lab] Simulates a slow response',
        querystring: Type.Object({ ms: Type.Optional(Type.Integer({ minimum: 0, maximum: 10000, default: 2000 })) }),
        response: { 200: Type.Object({ delayedMs: Type.Integer() }) },
      },
    },
    async (request, reply) => {
      const { ms = 2000 } = request.query as { ms?: number };
      await new Promise((resolve) => setTimeout(resolve, ms));
      reply.send({ delayedMs: ms });
    },
  );

  app.get(
    '/error',
    {
      schema: {
        tags: ['QA Scenarios'],
        summary: '[Lab] Simulates a 500 Internal Server Error',
        response: { 500: Type.Object({ type: Type.String(), title: Type.String(), status: Type.Integer(), code: Type.String(), detail: Type.String(), traceId: Type.String() }) },
      },
    },
    async () => {
      throw Errors.internal('Simulated internal server error for QA testing purposes.');
    },
  );

  app.get(
    '/rate-limit',
    {
      config: { rateLimit: { max: 3, timeWindow: 60000 } },
      schema: {
        tags: ['QA Scenarios'],
        summary: '[Lab] Enforces a strict rate limit (3 requests per minute) to practice 429 handling',
        response: { 200: Type.Object({ status: Type.String() }) },
      },
    },
    async (_request, reply) => {
      reply.send({ status: 'ok' });
    },
  );

  app.get(
    '/large-payload',
    {
      schema: {
        tags: ['QA Scenarios'],
        summary: '[Lab] Returns a large payload to practice performance/pagination handling',
        querystring: Type.Object({ items: Type.Optional(Type.Integer({ minimum: 1, maximum: 10000, default: 1000 })) }),
        response: { 200: Type.Object({ data: Type.Array(Type.Object({ index: Type.Integer(), value: Type.String() })) }) },
      },
    },
    async (request, reply) => {
      const { items = 1000 } = request.query as { items?: number };
      reply.send({ data: Array.from({ length: items }, (_, index) => ({ index, value: `item-${index}` })) });
    },
  );
}
