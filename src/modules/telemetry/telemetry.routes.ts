import { FastifyInstance } from 'fastify';
import { TelemetryService } from './telemetry.service';
import { toTelemetryPublic } from './telemetry.mapper';
import {
  CreateTelemetryBodySchema,
  TelemetryListQuerySchema,
  TelemetryListResponseSchema,
  TelemetrySchema,
} from './telemetry.schema';
import { UuidParamSchema } from '../../shared/schemas/common';

/** Telemetry is append-only: no PUT/DELETE routes are exposed by design. */
export default async function telemetryRoutes(app: FastifyInstance) {
  const service = new TelemetryService();

  app.addHook('preHandler', app.authenticate);

  app.get(
    '/robots/:id/telemetry',
    {
      schema: {
        tags: ['Telemetry'],
        summary: 'List telemetry records for a robot',
        security: [{ bearerAuth: [] }],
        params: UuidParamSchema,
        querystring: TelemetryListQuerySchema,
        response: { 200: TelemetryListResponseSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { page = 1, limit = 20 } = request.query as { page?: number; limit?: number };
      const { items, pagination } = await service.listByRobot(id, page, limit);
      reply.send({ data: items.map(toTelemetryPublic), pagination });
    },
  );

  app.post(
    '/robots/:id/telemetry',
    {
      preHandler: [app.authorize(['ADMIN', 'MANAGER', 'OPERATOR'])],
      schema: {
        tags: ['Telemetry'],
        summary: 'Record a telemetry reading for a robot (append-only)',
        security: [{ bearerAuth: [] }],
        params: UuidParamSchema,
        body: CreateTelemetryBodySchema,
        response: { 201: TelemetrySchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const record = await service.record(id, request.body as never);
      reply.status(201).send(toTelemetryPublic(record));
    },
  );

  app.get(
    '/telemetry/:id',
    {
      schema: {
        tags: ['Telemetry'],
        summary: 'Get a telemetry record by id',
        security: [{ bearerAuth: [] }],
        params: UuidParamSchema,
        response: { 200: TelemetrySchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      reply.send(toTelemetryPublic(await service.getById(id)));
    },
  );
}
