import { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { JobsService } from './jobs.service';
import { toJobPublic } from './jobs.mapper';
import {
  AssignJobBodySchema,
  CreateJobBodySchema,
  JobListQuerySchema,
  JobListResponseSchema,
  JobSchema,
  ReplaceJobBodySchema,
  UpdateJobBodySchema,
} from './jobs.schema';
import { UuidParamSchema } from '../../shared/schemas/common';
import { withIdempotency } from '../../shared/utils/idempotency';

export default async function jobsRoutes(app: FastifyInstance) {
  const service = new JobsService();

  app.addHook('preHandler', app.authenticate);

  app.get(
    '/',
    {
      schema: {
        tags: ['Jobs'],
        summary: 'List jobs',
        security: [{ bearerAuth: [] }],
        querystring: JobListQuerySchema,
        response: { 200: JobListResponseSchema },
      },
    },
    async (request, reply) => {
      const { items, pagination } = await service.list(request.query as never);
      reply.send({ data: items.map(toJobPublic), pagination });
    },
  );

  app.post(
    '/',
    {
      preHandler: [app.authorize(['ADMIN', 'MANAGER', 'OPERATOR'])],
      schema: {
        tags: ['Jobs'],
        summary: 'Create a job',
        security: [{ bearerAuth: [] }],
        body: CreateJobBodySchema,
        response: { 201: JobSchema },
      },
    },
    async (request, reply) => {
      const job = await service.create(request.body as never, request.currentUser!.id);
      reply.status(201).send(toJobPublic(job));
    },
  );

  app.get(
    '/:id',
    {
      schema: {
        tags: ['Jobs'],
        summary: 'Get a job by id',
        security: [{ bearerAuth: [] }],
        params: UuidParamSchema,
        response: { 200: JobSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      reply.send(toJobPublic(await service.getById(id)));
    },
  );

  app.put(
    '/:id',
    {
      preHandler: [app.authorize(['ADMIN', 'MANAGER', 'OPERATOR'])],
      schema: {
        tags: ['Jobs'],
        summary: 'Replace a job',
        security: [{ bearerAuth: [] }],
        params: UuidParamSchema,
        body: ReplaceJobBodySchema,
        response: { 200: JobSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const job = await service.replace(id, request.body as never, request.currentUser!.id);
      reply.send(toJobPublic(job));
    },
  );

  app.patch(
    '/:id',
    {
      preHandler: [app.authorize(['ADMIN', 'MANAGER', 'OPERATOR'])],
      schema: {
        tags: ['Jobs'],
        summary: 'Partially update a job',
        security: [{ bearerAuth: [] }],
        params: UuidParamSchema,
        body: UpdateJobBodySchema,
        response: { 200: JobSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const job = await service.update(id, request.body as never, request.currentUser!.id);
      reply.send(toJobPublic(job));
    },
  );

  app.delete(
    '/:id',
    {
      preHandler: [app.authorize(['ADMIN', 'MANAGER'])],
      schema: {
        tags: ['Jobs'],
        summary: 'Delete a job',
        security: [{ bearerAuth: [] }],
        params: UuidParamSchema,
        response: { 204: Type.Null() },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await service.remove(id, request.currentUser!.id);
      reply.status(204).send();
    },
  );

  app.post(
    '/:id/assign',
    {
      preHandler: [app.authorize(['ADMIN', 'MANAGER', 'OPERATOR'])],
      schema: {
        tags: ['Jobs'],
        summary: 'Assign a robot to a job (concurrency-safe)',
        security: [{ bearerAuth: [] }],
        params: UuidParamSchema,
        body: AssignJobBodySchema,
        response: { 200: JobSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const job = await service.assign(id, request.body as never, request.currentUser!.id);
      reply.send(toJobPublic(job));
    },
  );

  const simpleOperations: Array<{ path: string; method: keyof JobsService; summary: string }> = [
    { path: 'start', method: 'start', summary: 'Start a job (ASSIGNED -> RUNNING)' },
    { path: 'pause', method: 'pause', summary: 'Pause a job (RUNNING -> PAUSED)' },
    { path: 'resume', method: 'resume', summary: 'Resume a job (PAUSED -> RUNNING)' },
    { path: 'cancel', method: 'cancel', summary: 'Cancel a job' },
    { path: 'fail', method: 'fail', summary: 'Mark a job as failed' },
  ];

  for (const operation of simpleOperations) {
    app.post(
      `/:id/${operation.path}`,
      {
        preHandler: [app.authorize(['ADMIN', 'MANAGER', 'OPERATOR'])],
        schema: {
          tags: ['Jobs'],
          summary: operation.summary,
          security: [{ bearerAuth: [] }],
          params: UuidParamSchema,
          response: { 200: JobSchema },
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const job = await (service[operation.method] as (id: string, actorId: string) => Promise<unknown>)(
          id,
          request.currentUser!.id,
        );
        reply.send(toJobPublic(job as never));
      },
    );
  }

  app.post(
    '/:id/complete',
    {
      preHandler: [app.authorize(['ADMIN', 'MANAGER', 'OPERATOR'])],
      schema: {
        tags: ['Jobs'],
        summary: 'Complete a job (supports Idempotency-Key header)',
        security: [{ bearerAuth: [] }],
        params: UuidParamSchema,
        headers: Type.Object({ 'idempotency-key': Type.Optional(Type.String()) }),
        response: { 200: JobSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const idempotencyKey = request.headers['idempotency-key'] as string | undefined;
      const actorId = request.currentUser!.id;

      const { statusCode, body } = await withIdempotency(idempotencyKey, 'POST', `/jobs/${id}/complete`, async () => {
        const job = await service.complete(id, actorId);
        return { statusCode: 200, body: toJobPublic(job) };
      });

      reply.status(statusCode).send(body);
    },
  );
}
