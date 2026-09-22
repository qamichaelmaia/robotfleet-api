import { Incident, Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { Errors } from '../../shared/errors/app-error';
import { paginationMeta, toSkipTake } from '../../shared/utils/pagination';
import { recordAuditLog } from '../audit/audit.service';
import { createNotification, notifyRoles } from '../notifications/notifications.service';
import { CreateIncidentBody, IncidentListQuery, UpdateIncidentBody } from './incidents.schema';

export class IncidentsService {
  async list(query: IncidentListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.IncidentWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
      ...(query.robotId ? { robotId: query.robotId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.incident.findMany({ where, ...toSkipTake(page, limit), orderBy: { createdAt: 'asc' } }),
      prisma.incident.count({ where }),
    ]);

    return { items, pagination: paginationMeta(page, limit, total) };
  }

  async getById(id: string): Promise<Incident> {
    const incident = await prisma.incident.findUnique({ where: { id } });
    if (!incident) {
      throw Errors.notFound('Incident');
    }
    return incident;
  }

  /** Critical incidents atomically create the record, an audit log entry, and put the robot into ERROR. */
  async create(input: CreateIncidentBody, actorId: string) {
    if (input.robotId) {
      const robot = await prisma.robot.findUnique({ where: { id: input.robotId } });
      if (!robot) {
        throw Errors.notFound('Robot');
      }
    }
    if (input.jobId) {
      const job = await prisma.job.findUnique({ where: { id: input.jobId } });
      if (!job) {
        throw Errors.notFound('Job');
      }
    }

    const incident = await prisma.$transaction(async (tx) => {
      const created = await tx.incident.create({
        data: {
          robotId: input.robotId,
          jobId: input.jobId,
          type: input.type,
          severity: input.severity,
          description: input.description,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'CREATE_INCIDENT',
          entity: 'Incident',
          entityId: created.id,
          after: created as unknown as Prisma.InputJsonValue,
        },
      });

      if (input.severity === 'CRITICAL' && input.robotId) {
        await tx.robot.update({ where: { id: input.robotId }, data: { status: 'ERROR', version: { increment: 1 } } });
      }

      return created;
    });

    if (incident.severity === 'CRITICAL') {
      await notifyRoles(
        ['ADMIN', 'MANAGER'],
        'Critical incident reported',
        `A critical incident (${incident.type}) was reported.`,
        'CRITICAL',
      );
    }

    return incident;
  }

  async update(id: string, input: UpdateIncidentBody, actorId: string) {
    const before = await this.getById(id);
    const incident = await prisma.incident.update({ where: { id }, data: input });
    await recordAuditLog({ actorId, action: 'UPDATE_INCIDENT', entity: 'Incident', entityId: id, before, after: incident });
    return incident;
  }

  async investigate(id: string, actorId: string) {
    const incident = await this.getById(id);
    if (incident.status !== 'OPEN') {
      throw Errors.conflict(`Incident cannot move to INVESTIGATING from ${incident.status}.`, 'INVALID_INCIDENT_STATE_TRANSITION');
    }
    const updated = await prisma.incident.update({ where: { id }, data: { status: 'INVESTIGATING' } });
    await recordAuditLog({ actorId, action: 'INVESTIGATE_INCIDENT', entity: 'Incident', entityId: id, before: incident, after: updated });
    return updated;
  }

  async resolve(id: string, actorId: string) {
    const incident = await this.getById(id);
    if (incident.status !== 'INVESTIGATING' && incident.status !== 'OPEN') {
      throw Errors.conflict(`Incident cannot be resolved from ${incident.status}.`, 'INVALID_INCIDENT_STATE_TRANSITION');
    }
    const updated = await prisma.incident.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedAt: new Date(), resolvedBy: actorId },
    });
    await recordAuditLog({ actorId, action: 'RESOLVE_INCIDENT', entity: 'Incident', entityId: id, before: incident, after: updated });
    await createNotification({
      userId: actorId,
      title: 'Incident resolved',
      message: `Incident ${id} has been marked as resolved.`,
      type: 'INFO',
    });
    return updated;
  }

  async close(id: string, actorId: string) {
    const incident = await this.getById(id);
    if (incident.status !== 'RESOLVED') {
      throw Errors.conflict(`Incident cannot be closed from ${incident.status}.`, 'INVALID_INCIDENT_STATE_TRANSITION');
    }
    const updated = await prisma.incident.update({ where: { id }, data: { status: 'CLOSED' } });
    await recordAuditLog({ actorId, action: 'CLOSE_INCIDENT', entity: 'Incident', entityId: id, before: incident, after: updated });
    return updated;
  }
}
