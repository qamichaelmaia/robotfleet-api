import Fastify, { FastifyInstance } from 'fastify';
import { env } from './config/env';
import requestContextPlugin from './plugins/request-context';
import securityPlugin from './plugins/security';
import errorHandlerPlugin from './plugins/error-handler';
import authPlugin from './plugins/auth';
import openapiPlugin from './plugins/openapi';
import healthRoutes from './modules/health/health.routes';
import registerV1Routes from './routes';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: {
      level: env.isProduction ? 'info' : 'debug',
      transport: env.isProduction ? undefined : { target: 'pino-pretty' },
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    },
  });

  app.register(requestContextPlugin);
  app.register(securityPlugin);
  app.register(errorHandlerPlugin);
  app.register(authPlugin);
  app.register(openapiPlugin);

  app.register(healthRoutes);
  app.register(registerV1Routes, { prefix: '/api/v1' });

  return app;
}
