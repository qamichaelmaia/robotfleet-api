import { FastifyInstance } from 'fastify';
import { MaintenanceService } from './maintenance.service';
import { toMaintenancePublic } from './maintenance.mapper';
import {
  CreateMaintenanceBodySchema,
  MaintenanceListQuerySchema,
  MaintenanceListResponseSchema,
  MaintenanceSchema,
  ReplaceMaintenanceBodySchema,
  UpdateMaintenanceBodySchema,
} from './maintenance.schema';
import { UuidParamSchema } from '../../shared/schemas/common';

export default async function maintenanceRoutes(app: FastifyInstance) {
  const service = new MaintenanceService();

  app.addHook('preHandler', app.authenticate);

  app.get(
    '/',
    {
      schema: {
        tags: ['Maintenance'],
        summary: 'List maintenance records',
        security: [{ bearerAuth: [] }],
        querystring: MaintenanceListQuerySchema,
        response: { 200: MaintenanceListResponseSchema },
      },
    },
    async (request, reply) => {
      const { items, pagination } = await service.list(request.query as never);
      reply.send({ data: items.map(toMaintenancePublic), pagination });
    },
  );

  app.post(
    '/',
    {
      preHandler: [app.authorize(['ADMIN', 'MANAGER'])],
      schema: {
        tags: ['Maintenance'],
        summary: 'Schedule a maintenance record',
        security: [{ bearerAuth: [] }],
        body: CreateMaintenanceBodySchema,
        response: { 201: MaintenanceSchema },
      },
    },
    async (request, reply) => {
      const record = await service.create(request.body as never, request.currentUser!.id);
      reply.status(201).send(toMaintenancePublic(record));
    },
  );

  app.get(
    '/:id',
    {
      schema: {
        tags: ['Maintenance'],
        summary: 'Get a maintenance record by id',
        security: [{ bearerAuth: [] }],
        params: UuidParamSchema,
        response: { 200: MaintenanceSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      reply.send(toMaintenancePublic(await service.getById(id)));
    },
  );

  app.put(
    '/:id',
    {
      preHandler: [app.authorize(['ADMIN', 'MANAGER'])],
      schema: {
        tags: ['Maintenance'],
        summary: 'Replace a maintenance record',
        security: [{ bearerAuth: [] }],
        params: UuidParamSchema,
        body: ReplaceMaintenanceBodySchema,
        response: { 200: MaintenanceSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const record = await service.replace(id, request.body as never, request.currentUser!.id);
      reply.send(toMaintenancePublic(record));
    },
  );

  app.patch(
    '/:id',
    {
      preHandler: [app.authorize(['ADMIN', 'MANAGER'])],
      schema: {
        tags: ['Maintenance'],
        summary: 'Partially update a maintenance record',
        security: [{ bearerAuth: [] }],
        params: UuidParamSchema,
        body: UpdateMaintenanceBodySchema,
        response: { 200: MaintenanceSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const record = await service.update(id, request.body as never, request.currentUser!.id);
      reply.send(toMaintenancePublic(record));
    },
  );

  const operations: Array<{ path: string; method: keyof MaintenanceService; summary: string }> = [
    { path: 'start', method: 'start', summary: 'Start a maintenance record' },
    { path: 'complete', method: 'complete', summary: 'Complete a maintenance record' },
    { path: 'cancel', method: 'cancel', summary: 'Cancel a maintenance record' },
  ];

  for (const operation of operations) {
    app.post(
      `/:id/${operation.path}`,
      {
        preHandler: [app.authorize(['ADMIN', 'MANAGER'])],
        schema: {
          tags: ['Maintenance'],
          summary: operation.summary,
          security: [{ bearerAuth: [] }],
          params: UuidParamSchema,
          response: { 200: MaintenanceSchema },
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const record = await (service[operation.method] as (id: string, actorId: string) => Promise<unknown>)(
          id,
          request.currentUser!.id,
        );
        reply.send(toMaintenancePublic(record as never));
      },
    );
  }
}
