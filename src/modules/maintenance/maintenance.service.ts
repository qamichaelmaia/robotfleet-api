import { Maintenance, Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { Errors } from '../../shared/errors/app-error';
import { paginationMeta, toSkipTake } from '../../shared/utils/pagination';
import { recordAuditLog } from '../audit/audit.service';
import {
  CreateMaintenanceBody,
  MaintenanceListQuery,
  ReplaceMaintenanceBody,
  UpdateMaintenanceBody,
} from './maintenance.schema';

export class MaintenanceService {
  async list(query: MaintenanceListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.MaintenanceWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.robotId ? { robotId: query.robotId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.maintenance.findMany({ where, ...toSkipTake(page, limit), orderBy: { createdAt: 'asc' } }),
      prisma.maintenance.count({ where }),
    ]);

    return { items, pagination: paginationMeta(page, limit, total) };
  }

  async getById(id: string): Promise<Maintenance> {
    const record = await prisma.maintenance.findUnique({ where: { id } });
    if (!record) {
      throw Errors.notFound('Maintenance');
    }
    return record;
  }

  async create(input: CreateMaintenanceBody, actorId: string) {
    const robot = await prisma.robot.findUnique({ where: { id: input.robotId } });
    if (!robot) {
      throw Errors.notFound('Robot');
    }

    const record = await prisma.maintenance.create({
      data: {
        robotId: input.robotId,
        type: input.type,
        description: input.description,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      },
    });
    await recordAuditLog({ actorId, action: 'CREATE_MAINTENANCE', entity: 'Maintenance', entityId: record.id, after: record });
    return record;
  }

  async replace(id: string, input: ReplaceMaintenanceBody, actorId: string) {
    const before = await this.getById(id);
    const record = await prisma.maintenance.update({
      where: { id },
      data: {
        type: input.type,
        description: input.description,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      },
    });
    await recordAuditLog({ actorId, action: 'UPDATE_MAINTENANCE', entity: 'Maintenance', entityId: id, before, after: record });
    return record;
  }

  async update(id: string, input: UpdateMaintenanceBody, actorId: string) {
    const before = await this.getById(id);
    const record = await prisma.maintenance.update({
      where: { id },
      data: { ...input, scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined },
    });
    await recordAuditLog({ actorId, action: 'UPDATE_MAINTENANCE', entity: 'Maintenance', entityId: id, before, after: record });
    return record;
  }

  async start(id: string, actorId: string) {
    const record = await this.getById(id);
    if (record.status !== 'SCHEDULED') {
      throw Errors.conflict(`Maintenance cannot start from status ${record.status}.`, 'INVALID_MAINTENANCE_STATE_TRANSITION');
    }

    const robot = await prisma.robot.findUniqueOrThrow({ where: { id: record.robotId } });
    const activeJob = await prisma.job.findFirst({ where: { robotId: robot.id, status: 'RUNNING' } });
    if (activeJob) {
      throw Errors.conflict('Robot cannot enter maintenance while a job is running.', 'ROBOT_JOB_RUNNING');
    }
    if (robot.status !== 'AVAILABLE' && robot.status !== 'ERROR') {
      throw Errors.conflict(`Robot must be AVAILABLE or ERROR to start maintenance, current status is ${robot.status}.`, 'ROBOT_NOT_ELIGIBLE_FOR_MAINTENANCE');
    }

    await prisma.robot.update({ where: { id: robot.id }, data: { status: 'MAINTENANCE', version: { increment: 1 } } });
    const updated = await prisma.maintenance.update({
      where: { id },
      data: { status: 'IN_PROGRESS', startedAt: new Date(), performedBy: actorId },
    });
    await recordAuditLog({ actorId, action: 'START_MAINTENANCE', entity: 'Maintenance', entityId: id, before: record, after: updated });
    return updated;
  }

  async complete(id: string, actorId: string) {
    const record = await this.getById(id);
    if (record.status !== 'IN_PROGRESS') {
      throw Errors.conflict(`Maintenance cannot complete from status ${record.status}.`, 'INVALID_MAINTENANCE_STATE_TRANSITION');
    }

    await prisma.robot.update({ where: { id: record.robotId }, data: { status: 'AVAILABLE', version: { increment: 1 } } });
    const updated = await prisma.maintenance.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    await recordAuditLog({ actorId, action: 'COMPLETE_MAINTENANCE', entity: 'Maintenance', entityId: id, before: record, after: updated });
    return updated;
  }

  async cancel(id: string, actorId: string) {
    const record = await this.getById(id);
    if (record.status !== 'SCHEDULED') {
      throw Errors.conflict(`Maintenance cannot be cancelled from status ${record.status}.`, 'INVALID_MAINTENANCE_STATE_TRANSITION');
    }
    const updated = await prisma.maintenance.update({ where: { id }, data: { status: 'CANCELLED' } });
    await recordAuditLog({ actorId, action: 'CANCEL_MAINTENANCE', entity: 'Maintenance', entityId: id, before: record, after: updated });
    return updated;
  }
}
