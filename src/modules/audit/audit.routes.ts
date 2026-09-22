import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { paginationMeta, toSkipTake } from '../../shared/utils/pagination';
import { toAuditLogPublic } from './audit.mapper';
import { AuditLogListQuerySchema, AuditLogListResponseSchema } from './audit.schema';

/** Audit logs are immutable and read-only through the public API: no POST/PUT/PATCH/DELETE routes exist. */
export default async function auditRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);
  app.addHook('preHandler', app.authorize(['ADMIN']));

  app.get(
    '/',
    {
      schema: {
        tags: ['Audit'],
        summary: 'List audit logs (admin only, read-only)',
        security: [{ bearerAuth: [] }],
        querystring: AuditLogListQuerySchema,
        response: { 200: AuditLogListResponseSchema },
      },
    },
    async (request, reply) => {
      const { page = 1, limit = 20, entity, entityId, actorId } = request.query as {
        page?: number;
        limit?: number;
        entity?: string;
        entityId?: string;
        actorId?: string;
      };

      const where: Prisma.AuditLogWhereInput = {
        ...(entity ? { entity } : {}),
        ...(entityId ? { entityId } : {}),
        ...(actorId ? { actorId } : {}),
      };

      const [items, total] = await Promise.all([
        prisma.auditLog.findMany({ where, ...toSkipTake(page, limit), orderBy: { timestamp: 'desc' } }),
        prisma.auditLog.count({ where }),
      ]);

      reply.send({ data: items.map(toAuditLogPublic), pagination: paginationMeta(page, limit, total) });
    },
  );
}
