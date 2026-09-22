import { FastifyInstance } from 'fastify';
import authRoutes from '../modules/auth/auth.routes';
import usersRoutes from '../modules/users/users.routes';
import teamsRoutes from '../modules/teams/teams.routes';
import robotsRoutes from '../modules/robots/robots.routes';
import jobsRoutes from '../modules/jobs/jobs.routes';
import maintenanceRoutes from '../modules/maintenance/maintenance.routes';
import telemetryRoutes from '../modules/telemetry/telemetry.routes';
import incidentsRoutes from '../modules/incidents/incidents.routes';
import notificationsRoutes from '../modules/notifications/notifications.routes';
import auditRoutes from '../modules/audit/audit.routes';
import qaScenariosRoutes from '../modules/qa-scenarios/qa-scenarios.routes';

export default async function registerV1Routes(app: FastifyInstance) {
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(usersRoutes, { prefix: '/users' });
  await app.register(teamsRoutes, { prefix: '/teams' });
  await app.register(robotsRoutes, { prefix: '/robots' });
  await app.register(jobsRoutes, { prefix: '/jobs' });
  await app.register(maintenanceRoutes, { prefix: '/maintenance' });
  await app.register(telemetryRoutes);
  await app.register(incidentsRoutes, { prefix: '/incidents' });
  await app.register(notificationsRoutes, { prefix: '/notifications' });
  await app.register(auditRoutes, { prefix: '/audit-logs' });
  await app.register(qaScenariosRoutes, { prefix: '/qa-scenarios' });
}
