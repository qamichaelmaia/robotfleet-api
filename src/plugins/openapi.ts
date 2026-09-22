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
          'Public API for QA engineers to practice API testing, automation, contract testing, performance testing, security testing and modern backend quality engineering.\n\n🇧🇷 Versão em português desta documentação: [/docs/pt](/docs/pt)',
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

  registerPortugueseDocs(app);
});

const TAG_DESCRIPTIONS_PT: Record<string, string> = {
  Auth: 'Cadastro, login e gerenciamento de sessão',
  Users: 'Gerenciamento de contas de usuário',
  Teams: 'Equipes e membros de equipe',
  Robots: 'Gerenciamento da frota de robôs e comandos operacionais',
  Jobs: 'Tarefas operacionais executadas pelos robôs',
  Maintenance: 'Manutenção preventiva, corretiva e de inspeção',
  Telemetry: 'Leituras de telemetria dos robôs (somente inserção, sem edição)',
  Incidents: 'Incidentes operacionais e seu ciclo de vida',
  Notifications: 'Notificações do usuário',
  Audit: 'Trilha de auditoria imutável (somente leitura)',
  Health: 'Verificações de saúde, liveness e readiness',
  'QA Scenarios': 'Endpoints de laboratório para treinamento de QA (atraso/erro/rate-limit)',
};

/** Serves a Portuguese-translated copy of the docs (title/description/tags) reusing the same swagger-ui assets. */
function registerPortugueseDocs(app: FastifyInstance) {
  app.get('/docs/pt/openapi.json', async () => {
    const spec = JSON.parse(JSON.stringify(app.swagger())) as ReturnType<typeof app.swagger> & {
      info: { title: string; description: string };
      tags?: Array<{ name: string; description?: string }>;
    };

    spec.info.title = 'Robot Fleet API (Documentação em Português)';
    spec.info.description =
      'API pública para profissionais de QA praticarem testes de API, automação, contract testing, testes de performance, testes de segurança e engenharia de qualidade de backend moderna. Os nomes de endpoints, campos e schemas permanecem em inglês (padrão de mercado); apenas os textos descritivos foram traduzidos.\n\n🇺🇸 English version of this documentation: [/docs](/docs)';

    spec.tags = spec.tags?.map((tag) => ({
      ...tag,
      description: TAG_DESCRIPTIONS_PT[tag.name] ?? tag.description,
    }));

    return spec;
  });

  app.get('/docs/pt/swagger-initializer.js', async (_request, reply) => {
    reply.type('application/javascript').send(`window.onload = () => {
  window.ui = SwaggerUIBundle({
    url: '/docs/pt/openapi.json',
    dom_id: '#swagger-ui',
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
    layout: 'StandaloneLayout',
    docExpansion: 'list',
    deepLinking: true,
  });
};`);
  });

  app.get('/docs/pt', async (_request, reply) => {
    reply.type('text/html').send(`<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Robot Fleet API - Documentação em Português</title>
    <link rel="stylesheet" href="/docs/static/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/docs/static/swagger-ui-bundle.js"></script>
    <script src="/docs/static/swagger-ui-standalone-preset.js"></script>
    <script src="/docs/pt/swagger-initializer.js"></script>
  </body>
</html>`);
  });
}
