import { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { TeamsService } from './teams.service';
import { toTeamPublic } from './teams.mapper';
import { toUserPublic } from '../users/users.mapper';
import {
  AddTeamMemberBodySchema,
  CreateTeamBodySchema,
  ReplaceTeamBodySchema,
  TeamListQuerySchema,
  TeamListResponseSchema,
  TeamMemberListResponseSchema,
  TeamSchema,
  UpdateTeamBodySchema,
} from './teams.schema';
import { UuidParamSchema } from '../../shared/schemas/common';

export default async function teamsRoutes(app: FastifyInstance) {
  const service = new TeamsService();

  app.addHook('preHandler', app.authenticate);

  app.get(
    '/',
    {
      schema: {
        tags: ['Teams'],
        summary: 'List teams',
        security: [{ bearerAuth: [] }],
        querystring: TeamListQuerySchema,
        response: { 200: TeamListResponseSchema },
      },
    },
    async (request, reply) => {
      const { items, pagination } = await service.list(request.query as never);
      reply.send({ data: items.map(toTeamPublic), pagination });
    },
  );

  app.post(
    '/',
    {
      preHandler: [app.authorize(['ADMIN', 'MANAGER'])],
      schema: {
        tags: ['Teams'],
        summary: 'Create a team',
        security: [{ bearerAuth: [] }],
        body: CreateTeamBodySchema,
        response: { 201: TeamSchema },
      },
    },
    async (request, reply) => {
      const team = await service.create(request.body as never, request.currentUser!.id);
      reply.status(201).send(toTeamPublic(team));
    },
  );

  app.get(
    '/:id',
    {
      schema: {
        tags: ['Teams'],
        summary: 'Get a team by id',
        security: [{ bearerAuth: [] }],
        params: UuidParamSchema,
        response: { 200: TeamSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const team = await service.getById(id);
      reply.send(toTeamPublic(team));
    },
  );

  app.put(
    '/:id',
    {
      preHandler: [app.authorize(['ADMIN', 'MANAGER'])],
      schema: {
        tags: ['Teams'],
        summary: 'Replace a team',
        security: [{ bearerAuth: [] }],
        params: UuidParamSchema,
        body: ReplaceTeamBodySchema,
        response: { 200: TeamSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const team = await service.replace(id, request.body as never, request.currentUser!.id);
      reply.send(toTeamPublic(team));
    },
  );

  app.patch(
    '/:id',
    {
      preHandler: [app.authorize(['ADMIN', 'MANAGER'])],
      schema: {
        tags: ['Teams'],
        summary: 'Partially update a team',
        security: [{ bearerAuth: [] }],
        params: UuidParamSchema,
        body: UpdateTeamBodySchema,
        response: { 200: TeamSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const team = await service.update(id, request.body as never, request.currentUser!.id);
      reply.send(toTeamPublic(team));
    },
  );

  app.delete(
    '/:id',
    {
      preHandler: [app.authorize(['ADMIN', 'MANAGER'])],
      schema: {
        tags: ['Teams'],
        summary: 'Delete a team',
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

  app.get(
    '/:id/members',
    {
      schema: {
        tags: ['Teams'],
        summary: 'List team members',
        security: [{ bearerAuth: [] }],
        params: UuidParamSchema,
        querystring: Type.Object({
          page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
          limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
        }),
        response: { 200: TeamMemberListResponseSchema },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { page = 1, limit = 20 } = request.query as { page?: number; limit?: number };
      const { items, pagination } = await service.listMembers(id, page, limit);
      reply.send({ data: items.map(toUserPublic), pagination });
    },
  );

  app.post(
    '/:id/members',
    {
      preHandler: [app.authorize(['ADMIN', 'MANAGER'])],
      schema: {
        tags: ['Teams'],
        summary: 'Add a member to a team',
        security: [{ bearerAuth: [] }],
        params: UuidParamSchema,
        body: AddTeamMemberBodySchema,
        response: { 201: Type.Object({ teamId: Type.String(), userId: Type.String() }) },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { userId } = request.body as { userId: string };
      const member = await service.addMember(id, userId, request.currentUser!.id);
      reply.status(201).send({ teamId: member.teamId, userId: member.userId });
    },
  );

  app.delete(
    '/:id/members/:userId',
    {
      preHandler: [app.authorize(['ADMIN', 'MANAGER'])],
      schema: {
        tags: ['Teams'],
        summary: 'Remove a member from a team',
        security: [{ bearerAuth: [] }],
        params: Type.Object({ id: Type.String({ format: 'uuid' }), userId: Type.String({ format: 'uuid' }) }),
        response: { 204: Type.Null() },
      },
    },
    async (request, reply) => {
      const { id, userId } = request.params as { id: string; userId: string };
      await service.removeMember(id, userId, request.currentUser!.id);
      reply.status(204).send();
    },
  );
}
