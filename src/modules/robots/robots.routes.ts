import { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { RobotsService } from './robots.service';
import { toRobotPublic } from './robots.mapper';
import {
  CreateRobotBodySchema,
  ReplaceRobotBodySchema,
  RobotListQuerySchema,
  RobotListResponseSchema,
  RobotSchema,
  UpdateRobotBodySchema,
} from './robots.schema';
import { UuidParamSchema } from '../../shared/schemas/common';

export default async function robotsRoutes(app: FastifyInstance) {
  const service = new RobotsService();

  app.addHook('preHandler', app.authenticate);

  app.get(
    '/',
    {
      schema: {
        tags: ['Robots'],
        summary: 'List robots',
        security: [{ bearerAuth: [] }],
        querystring: RobotListQuerySchema,
        response: { 200: RobotListResponseSchema },
      },
    },
    async (request, reply) => {
      const { items, pagination } = await service.list(request.query as never);
      reply.send({ data: items.map(toRobotPublic), pagination });
    },
  );

  app.post(
    '/',
    {
      preHandler: [app.authorize(['ADMIN', 'MANAGER'])],
      schema: {
        tags: ['Robots'],
        summary: 'Register a new robot',
        security: [{ bearerAuth: [] }],
        body: CreateRobotBodySchema,
        response: { 201: RobotSchema },
      },
    },
    async (request, reply) => {
      const robot = await service.create(request.body as never, request.currentUser!.id);
      reply.status(201).send(toRobotPublic(robot));
    },
  );

  app.get(
    '/:id',
    {
      schema: {
        tags: ['Robots'],
        summary: 'Get a robot by id',
        security: [{ bearerAuth: [] }],
        params: UuidParamSchema,
        response: { 200: RobotSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      reply.send(toRobotPublic(await service.getById(id)));
    },
  );

  app.put(
    '/:id',
    {
      preHandler: [app.authorize(['ADMIN', 'MANAGER'])],
      schema: {
        tags: ['Robots'],
        summary: 'Replace a robot',
        security: [{ bearerAuth: [] }],
        params: UuidParamSchema,
        body: ReplaceRobotBodySchema,
        response: { 200: RobotSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const robot = await service.replace(id, request.body as never, request.currentUser!.id);
      reply.send(toRobotPublic(robot));
    },
  );

  app.patch(
    '/:id',
    {
      preHandler: [app.authorize(['ADMIN', 'MANAGER'])],
      schema: {
        tags: ['Robots'],
        summary: 'Partially update a robot',
        security: [{ bearerAuth: [] }],
        params: UuidParamSchema,
        body: UpdateRobotBodySchema,
        response: { 200: RobotSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const robot = await service.update(id, request.body as never, request.currentUser!.id);
      reply.send(toRobotPublic(robot));
    },
  );

  app.delete(
    '/:id',
    {
      preHandler: [app.authorize(['ADMIN'])],
      schema: {
        tags: ['Robots'],
        summary: 'Delete a robot',
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

  const operations: Array<{ path: string; method: keyof RobotsService; summary: string }> = [
    { path: 'activate', method: 'activate', summary: 'Activate a robot (OFFLINE -> AVAILABLE)' },
    { path: 'deactivate', method: 'deactivate', summary: 'Deactivate a robot (AVAILABLE -> OFFLINE)' },
    { path: 'start', method: 'start', summary: 'Start a robot job execution (ASSIGNED -> RUNNING)' },
    { path: 'pause', method: 'pause', summary: 'Pause a running robot (RUNNING -> PAUSED)' },
    { path: 'resume', method: 'resume', summary: 'Resume a paused robot (PAUSED -> RUNNING)' },
    { path: 'shutdown', method: 'shutdown', summary: 'Shut down a running robot (RUNNING -> AVAILABLE)' },
    { path: 'retire', method: 'retire', summary: 'Retire a robot permanently' },
  ];

  for (const operation of operations) {
    app.post(
      `/:id/${operation.path}`,
      {
        preHandler: [app.authorize(['ADMIN', 'MANAGER', 'OPERATOR'])],
        schema: {
          tags: ['Robots'],
          summary: operation.summary,
          security: [{ bearerAuth: [] }],
          params: UuidParamSchema,
          response: { 200: RobotSchema },
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const robot = await (service[operation.method] as (id: string, actorId: string) => Promise<unknown>)(
          id,
          request.currentUser!.id,
        );
        reply.send(toRobotPublic(robot as never));
      },
    );
  }
}
