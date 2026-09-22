import fp from 'fastify-plugin';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import { FastifyInstance } from 'fastify';
import { env } from '../config/env';

export default fp(async function securityPlugin(app: FastifyInstance) {
  await app.register(fastifyHelmet, { global: true });
  await app.register(fastifyCors, {
    origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(','),
  });
  await app.register(fastifyRateLimit, {
    global: true,
    max: env.rateLimitMax,
    timeWindow: env.rateLimitWindow,
  });
});
