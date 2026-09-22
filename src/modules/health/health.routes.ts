import { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { prisma } from '../../database/prisma';

const HealthResponseSchema = Type.Object({
  status: Type.String(),
  version: Type.String(),
  timestamp: Type.String({ format: 'date-time' }),
});

export default async function healthRoutes(app: FastifyInstance) {
  app.get(
    '/health',
    { schema: { tags: ['Health'], summary: 'Basic health check', response: { 200: HealthResponseSchema } } },
    async (_request, reply) => {
      reply.send({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
    },
  );

  app.get(
    '/health/live',
    { schema: { tags: ['Health'], summary: 'Liveness probe', response: { 200: HealthResponseSchema } } },
    async (_request, reply) => {
      reply.send({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
    },
  );

  app.get(
    '/health/ready',
    { schema: { tags: ['Health'], summary: 'Readiness probe (verifies database connectivity)', response: { 200: HealthResponseSchema } } },
    async (_request, reply) => {
      await prisma.$queryRaw`SELECT 1`;
      reply.send({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
    },
  );
}
