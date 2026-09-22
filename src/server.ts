import { buildApp } from './app';
import { env } from './config/env';

const app = buildApp();

app
  .listen({ port: env.port, host: '0.0.0.0' })
  .then(() => {
    app.log.info(`Robot Fleet API listening on port ${env.port}`);
    app.log.info(`Swagger UI available at http://localhost:${env.port}/docs`);
  })
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
