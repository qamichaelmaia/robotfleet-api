import { Prisma, Robot, RobotStatus } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { Errors } from '../../shared/errors/app-error';
import { paginationMeta, toSkipTake } from '../../shared/utils/pagination';
import { recordAuditLog } from '../audit/audit.service';
import { notifyRoles } from '../notifications/notifications.service';
import { assertValidRobotTransition } from './robots.state-machine';
import { CreateRobotBody, ReplaceRobotBody, RobotListQuery, UpdateRobotBody } from './robots.schema';

const LOW_BATTERY_THRESHOLD = 20;
const MIN_BATTERY_TO_START = 10;

export class RobotsService {
  async list(query: RobotListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.RobotWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.teamId ? { teamId: query.teamId } : {}),
      ...(query.model ? { model: query.model } : {}),
      ...(query.minBattery !== undefined || query.maxBattery !== undefined
        ? {
            batteryLevel: {
              ...(query.minBattery !== undefined ? { gte: query.minBattery } : {}),
              ...(query.maxBattery !== undefined ? { lte: query.maxBattery } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.robot.findMany({ where, ...toSkipTake(page, limit), orderBy: { createdAt: 'asc' } }),
      prisma.robot.count({ where }),
    ]);

    return { items, pagination: paginationMeta(page, limit, total) };
  }

  async getById(id: string): Promise<Robot> {
    const robot = await prisma.robot.findUnique({ where: { id } });
    if (!robot) {
      throw Errors.notFound('Robot');
    }
    return robot;
  }

  async create(input: CreateRobotBody, actorId: string) {
    const existing = await prisma.robot.findUnique({ where: { serialNumber: input.serialNumber } });
    if (existing) {
      throw Errors.conflict('A robot with this serial number already exists.', 'SERIAL_NUMBER_ALREADY_EXISTS');
    }

    if (input.batteryLevel !== undefined && (input.batteryLevel < 0 || input.batteryLevel > 100)) {
      throw Errors.validation('batteryLevel must be between 0 and 100.');
    }

    const robot = await prisma.robot.create({
      data: {
        serialNumber: input.serialNumber,
        name: input.name,
        model: input.model,
        teamId: input.teamId,
        batteryLevel: input.batteryLevel ?? 100,
        latitude: input.latitude,
        longitude: input.longitude,
      },
    });

    await recordAuditLog({ actorId, action: 'CREATE_ROBOT', entity: 'Robot', entityId: robot.id, after: robot });
    return robot;
  }

  async replace(id: string, input: ReplaceRobotBody, actorId: string) {
    const before = await this.getById(id);
    const robot = await prisma.robot.update({
      where: { id },
      data: { name: input.name, model: input.model, teamId: input.teamId, latitude: input.latitude, longitude: input.longitude },
    });
    await recordAuditLog({ actorId, action: 'UPDATE_ROBOT', entity: 'Robot', entityId: id, before, after: robot });
    return robot;
  }

  async update(id: string, input: UpdateRobotBody, actorId: string) {
    const before = await this.getById(id);
    const robot = await prisma.robot.update({ where: { id }, data: input });
    await recordAuditLog({ actorId, action: 'UPDATE_ROBOT', entity: 'Robot', entityId: id, before, after: robot });
    return robot;
  }

  async remove(id: string, actorId: string) {
    const before = await this.getById(id);
    if (before.status === 'RUNNING' || before.status === 'ASSIGNED') {
      throw Errors.conflict('Robot cannot be deleted while it has operations in progress.', 'ROBOT_HAS_ACTIVE_OPERATIONS');
    }
    await prisma.robot.delete({ where: { id } });
    await recordAuditLog({ actorId, action: 'DELETE_ROBOT', entity: 'Robot', entityId: id, before });
  }

  /** Optimistic-concurrency transition: fails with 409 if another request already moved the robot. */
  private async transition(id: string, next: RobotStatus, actorId: string, action: string): Promise<Robot> {
    const current = await this.getById(id);
    assertValidRobotTransition(current.status, next);

    const result = await prisma.robot.updateMany({
      where: { id, version: current.version },
      data: { status: next, version: { increment: 1 } },
    });

    if (result.count === 0) {
      throw Errors.conflict(
        'Robot state changed concurrently. Please retry with the latest state.',
        'ROBOT_CONCURRENT_MODIFICATION',
      );
    }

    const robot = await prisma.robot.findUniqueOrThrow({ where: { id } });
    await recordAuditLog({ actorId, action, entity: 'Robot', entityId: id, before: current, after: robot });
    return robot;
  }

  async activate(id: string, actorId: string) {
    return this.transition(id, 'AVAILABLE', actorId, 'ACTIVATE_ROBOT');
  }

  async deactivate(id: string, actorId: string) {
    return this.transition(id, 'OFFLINE', actorId, 'DEACTIVATE_ROBOT');
  }

  async start(id: string, actorId: string) {
    const robot = await this.getById(id);
    if (robot.batteryLevel < MIN_BATTERY_TO_START) {
      throw Errors.conflict(
        `Robot battery level (${robot.batteryLevel}%) is below the minimum required to start a job (${MIN_BATTERY_TO_START}%).`,
        'INSUFFICIENT_BATTERY',
      );
    }
    const updated = await this.transition(id, 'RUNNING', actorId, 'START_ROBOT');
    if (updated.batteryLevel <= LOW_BATTERY_THRESHOLD) {
      await notifyRoles(['ADMIN', 'MANAGER'], 'Low battery alert', `Robot ${updated.serialNumber} battery is at ${updated.batteryLevel}%.`);
    }
    return updated;
  }

  async pause(id: string, actorId: string) {
    return this.transition(id, 'PAUSED', actorId, 'PAUSE_ROBOT');
  }

  async resume(id: string, actorId: string) {
    return this.transition(id, 'RUNNING', actorId, 'RESUME_ROBOT');
  }

  async shutdown(id: string, actorId: string) {
    return this.transition(id, 'AVAILABLE', actorId, 'SHUTDOWN_ROBOT');
  }

  async retire(id: string, actorId: string) {
    return this.transition(id, 'RETIRED', actorId, 'RETIRE_ROBOT');
  }
}
