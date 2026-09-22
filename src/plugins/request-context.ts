import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
    startTime: number;
  }
}

export default fp(async function requestContextPlugin(app: FastifyInstance) {
  app.addHook('onRequest', async (request) => {
    request.requestId = (request.headers['x-request-id'] as string) ?? randomUUID();
    request.startTime = Date.now();
  });

  app.addHook('onResponse', async (request, reply) => {
    request.log.info(
      {
        requestId: request.requestId,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        duration: Date.now() - request.startTime,
      },
      'request completed',
    );
  });
});
