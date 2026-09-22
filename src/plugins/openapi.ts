import fp from 'fastify-plugin';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { FastifyInstance } from 'fastify';
import { ProblemDetailsSchema, PaginationMetaSchema } from '../shared/schemas/common';

export default fp(async function openapiPlugin(app: FastifyInstance) {
  app.addSchema(PaginationMetaSchema);
  app.addSchema(ProblemDetailsSchema);

  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Robot Fleet API',
        description:
          'Public API for QA engineers to practice API testing, automation, contract testing, performance testing, security testing and modern backend quality engineering.',
        version: '1.0.0',
        contact: { name: 'Robot Fleet API', url: 'https://github.com' },
      },
      servers: [{ url: '/', description: 'Current server' }],
      tags: [
        { name: 'Auth', description: 'Registration, login and session management' },
        { name: 'Users', description: 'User account management' },
        { name: 'Teams', description: 'Teams and team membership' },
        { name: 'Robots', description: 'Robot fleet management and operational commands' },
        { name: 'Jobs', description: 'Operational jobs executed by robots' },
        { name: 'Maintenance', description: 'Preventive, corrective and inspection maintenance' },
        { name: 'Telemetry', description: 'Append-only robot telemetry readings' },
        { name: 'Incidents', description: 'Operational incidents and their lifecycle' },
        { name: 'Notifications', description: 'User notifications' },
        { name: 'Audit', description: 'Immutable audit trail (read-only)' },
        { name: 'Health', description: 'Health, liveness and readiness probes' },
        { name: 'QA Scenarios', description: 'Laboratory endpoints for QA training (delay/error/rate-limit)' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true },
  });
});
