import { FastifyInstance } from 'fastify';
import { UsersService } from './users.service';
import { toUserPublic } from './users.mapper';
import {
  CreateUserBodySchema,
  ReplaceUserBodySchema,
  UpdateUserBodySchema,
  UserListQuerySchema,
  UserListResponseSchema,
  UserPublicSchema,
} from './users.schema';
import { UuidParamSchema } from '../../shared/schemas/common';
import { Type } from '@sinclair/typebox';

export default async function usersRoutes(app: FastifyInstance) {
  const service = new UsersService();

  app.addHook('preHandler', app.authenticate);

  app.get(
    '/',
    {
      preHandler: [app.authorize(['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'])],
      schema: {
        tags: ['Users'],
        summary: 'List users',
        security: [{ bearerAuth: [] }],
        querystring: UserListQuerySchema,
        response: { 200: UserListResponseSchema },
      },
    },
    async (request, reply) => {
      const { items, pagination } = await service.list(request.query as never);
      reply.send({ data: items.map(toUserPublic), pagination });
    },
  );

  app.post(
    '/',
    {
      preHandler: [app.authorize(['ADMIN'])],
      schema: {
        tags: ['Users'],
        summary: 'Create a user',
        security: [{ bearerAuth: [] }],
        body: CreateUserBodySchema,
        response: { 201: UserPublicSchema },
      },
    },
    async (request, reply) => {
      const user = await service.create(request.body as never, request.currentUser!.id);
      reply.status(201).send(toUserPublic(user));
    },
  );

  app.get(
    '/:id',
    {
      preHandler: [app.authorize(['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'])],
      schema: {
        tags: ['Users'],
        summary: 'Get a user by id',
        security: [{ bearerAuth: [] }],
        params: UuidParamSchema,
        response: { 200: UserPublicSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = await service.getById(id);
      reply.send(toUserPublic(user));
    },
  );

  app.put(
    '/:id',
    {
      preHandler: [app.authorize(['ADMIN'])],
      schema: {
        tags: ['Users'],
        summary: 'Replace a user',
        security: [{ bearerAuth: [] }],
        params: UuidParamSchema,
        body: ReplaceUserBodySchema,
        response: { 200: UserPublicSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = await service.replace(id, request.body as never, request.currentUser!.id);
      reply.send(toUserPublic(user));
    },
  );

  app.patch(
    '/:id',
    {
      preHandler: [app.authorize(['ADMIN'])],
      schema: {
        tags: ['Users'],
        summary: 'Partially update a user',
        security: [{ bearerAuth: [] }],
        params: UuidParamSchema,
        body: UpdateUserBodySchema,
        response: { 200: UserPublicSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = await service.update(id, request.body as never, request.currentUser!.id);
      reply.send(toUserPublic(user));
    },
  );

  app.delete(
    '/:id',
    {
      preHandler: [app.authorize(['ADMIN'])],
      schema: {
        tags: ['Users'],
        summary: 'Delete a user',
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
}
