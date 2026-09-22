import { FastifyInstance } from 'fastify';
import { prisma } from '../../database/prisma';
import { Errors } from '../../shared/errors/app-error';
import { paginationMeta, toSkipTake } from '../../shared/utils/pagination';
import { toNotificationPublic } from './notifications.mapper';
import { NotificationListQuerySchema, NotificationListResponseSchema, NotificationSchema } from './notifications.schema';
import { UuidParamSchema } from '../../shared/schemas/common';

export default async function notificationsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get(
    '/',
    {
      schema: {
        tags: ['Notifications'],
        summary: "List the current user's notifications",
        security: [{ bearerAuth: [] }],
        querystring: NotificationListQuerySchema,
        response: { 200: NotificationListResponseSchema },
      },
    },
    async (request, reply) => {
      const { page = 1, limit = 20, read } = request.query as { page?: number; limit?: number; read?: boolean };
      const userId = request.currentUser!.id;
      const where = { userId, ...(read !== undefined ? { read } : {}) };

      const [items, total] = await Promise.all([
        prisma.notification.findMany({ where, ...toSkipTake(page, limit), orderBy: { createdAt: 'desc' } }),
        prisma.notification.count({ where }),
      ]);

      reply.send({ data: items.map(toNotificationPublic), pagination: paginationMeta(page, limit, total) });
    },
  );

  app.patch(
    '/:id/read',
    {
      schema: {
        tags: ['Notifications'],
        summary: 'Mark a notification as read',
        security: [{ bearerAuth: [] }],
        params: UuidParamSchema,
        response: { 200: NotificationSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const notification = await prisma.notification.findUnique({ where: { id } });
      if (!notification || notification.userId !== request.currentUser!.id) {
        throw Errors.notFound('Notification');
      }
      const updated = await prisma.notification.update({
        where: { id },
        data: { read: true, readAt: new Date() },
      });
      reply.send(toNotificationPublic(updated));
    },
  );
}
