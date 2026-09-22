import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../config/env';
import { Errors } from '../shared/errors/app-error';
import { prisma } from '../database/prisma';
import { UserRole } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  type: 'access';
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorize: (roles: UserRole[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    currentUser?: { id: string; role: UserRole };
  }
}

export default fp(async function authPlugin(app: FastifyInstance) {
  app.register(fastifyJwt, {
    secret: env.jwtSecret,
  });

  app.decorate('authenticate', async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      throw Errors.unauthorized('Missing or invalid access token.');
    }

    const payload = request.user as AccessTokenPayload;
    if (payload.type !== 'access') {
      throw Errors.unauthorized('Token is not a valid access token.');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw Errors.unauthorized('User associated with this token no longer exists.');
    }
    if (user.status === 'SUSPENDED') {
      throw Errors.forbidden('User account is suspended.');
    }
    if (user.status === 'INACTIVE') {
      throw Errors.forbidden('User account is inactive.');
    }

    request.currentUser = { id: user.id, role: user.role };
  });

  app.decorate('authorize', (roles: UserRole[]) => {
    return async (request: FastifyRequest, _reply: FastifyReply) => {
      if (!request.currentUser) {
        throw Errors.unauthorized();
      }
      if (!roles.includes(request.currentUser.role)) {
        throw Errors.forbidden(`This action requires one of the following roles: ${roles.join(', ')}.`);
      }
    };
  });
});
