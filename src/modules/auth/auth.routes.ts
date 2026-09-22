import { FastifyInstance } from 'fastify';
import { AuthService } from './auth.service';
import {
  RegisterBodySchema,
  LoginBodySchema,
  RefreshBodySchema,
  AuthTokensSchema,
  UserPublicSchema,
} from './auth.schema';
import { Type } from '@sinclair/typebox';
import { toUserPublic } from '../users/users.mapper';
import { env } from '../../config/env';

export default async function authRoutes(app: FastifyInstance) {
  const service = new AuthService(app);

  app.post(
    '/register',
    {
      config: {
        rateLimit: { max: env.authRateLimitMax, timeWindow: env.authRateLimitWindow },
      },
      schema: {
        tags: ['Auth'],
        summary: 'Register a new user account',
        body: RegisterBodySchema,
        response: { 201: UserPublicSchema },
      },
    },
    async (request, reply) => {
      const user = await service.register(request.body as never);
      reply.status(201).send(toUserPublic(user));
    },
  );

  app.post(
    '/login',
    {
      config: {
        rateLimit: { max: env.authRateLimitMax, timeWindow: env.authRateLimitWindow },
      },
      schema: {
        tags: ['Auth'],
        summary: 'Authenticate and obtain access/refresh tokens',
        body: LoginBodySchema,
        response: { 200: AuthTokensSchema },
      },
    },
    async (request, reply) => {
      const tokens = await service.login(request.body as never);
      reply.status(200).send(tokens);
    },
  );

  app.post(
    '/refresh',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Exchange a refresh token for a new token pair',
        body: RefreshBodySchema,
        response: { 200: AuthTokensSchema },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body as { refreshToken: string };
      const tokens = await service.refresh(refreshToken);
      reply.status(200).send(tokens);
    },
  );

  app.post(
    '/logout',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Revoke a refresh token',
        body: RefreshBodySchema,
        response: { 204: Type.Null() },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body as { refreshToken: string };
      await service.logout(refreshToken);
      reply.status(204).send();
    },
  );

  app.get(
    '/me',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Auth'],
        summary: 'Get the currently authenticated user',
        security: [{ bearerAuth: [] }],
        response: { 200: UserPublicSchema },
      },
    },
    async (request, reply) => {
      const user = await service.me(request.currentUser!.id);
      reply.status(200).send(toUserPublic(user));
    },
  );
}
