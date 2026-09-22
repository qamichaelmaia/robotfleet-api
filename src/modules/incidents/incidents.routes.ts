import { FastifyInstance } from 'fastify';
import { IncidentsService } from './incidents.service';
import { toIncidentPublic } from './incidents.mapper';
import {
  CreateIncidentBodySchema,
  IncidentListQuerySchema,
  IncidentListResponseSchema,
  IncidentSchema,
  UpdateIncidentBodySchema,
} from './incidents.schema';
import { UuidParamSchema } from '../../shared/schemas/common';

export default async function incidentsRoutes(app: FastifyInstance) {
  const service = new IncidentsService();

  app.addHook('preHandler', app.authenticate);

  app.get(
    '/',
    {
      schema: {
        tags: ['Incidents'],
        summary: 'List incidents',
        security: [{ bearerAuth: [] }],
        querystring: IncidentListQuerySchema,
        response: { 200: IncidentListResponseSchema },
      },
    },
    async (request, reply) => {
      const { items, pagination } = await service.list(request.query as never);
      reply.send({ data: items.map(toIncidentPublic), pagination });
    },
  );

  app.post(
    '/',
    {
      preHandler: [app.authorize(['ADMIN', 'MANAGER', 'OPERATOR'])],
      schema: {
        tags: ['Incidents'],
        summary: 'Report an incident',
        security: [{ bearerAuth: [] }],
        body: CreateIncidentBodySchema,
        response: { 201: IncidentSchema },
      },
    },
    async (request, reply) => {
      const incident = await service.create(request.body as never, request.currentUser!.id);
      reply.status(201).send(toIncidentPublic(incident));
    },
  );

  app.get(
    '/:id',
    {
      schema: {
        tags: ['Incidents'],
        summary: 'Get an incident by id',
        security: [{ bearerAuth: [] }],
        params: UuidParamSchema,
        response: { 200: IncidentSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      reply.send(toIncidentPublic(await service.getById(id)));
    },
  );

  app.patch(
    '/:id',
    {
      preHandler: [app.authorize(['ADMIN', 'MANAGER', 'OPERATOR'])],
      schema: {
        tags: ['Incidents'],
        summary: 'Partially update an incident',
        security: [{ bearerAuth: [] }],
        params: UuidParamSchema,
        body: UpdateIncidentBodySchema,
        response: { 200: IncidentSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const incident = await service.update(id, request.body as never, request.currentUser!.id);
      reply.send(toIncidentPublic(incident));
    },
  );

  const operations: Array<{ path: string; method: keyof IncidentsService; summary: string }> = [
    { path: 'investigate', method: 'investigate', summary: 'Move an incident to INVESTIGATING' },
    { path: 'resolve', method: 'resolve', summary: 'Resolve an incident' },
    { path: 'close', method: 'close', summary: 'Close a resolved incident' },
  ];

  for (const operation of operations) {
    app.post(
      `/:id/${operation.path}`,
      {
        preHandler: [app.authorize(['ADMIN', 'MANAGER', 'OPERATOR'])],
        schema: {
          tags: ['Incidents'],
          summary: operation.summary,
          security: [{ bearerAuth: [] }],
          params: UuidParamSchema,
          response: { 200: IncidentSchema },
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const incident = await (service[operation.method] as (id: string, actorId: string) => Promise<unknown>)(
          id,
          request.currentUser!.id,
        );
        reply.send(toIncidentPublic(incident as never));
      },
    );
  }
}
