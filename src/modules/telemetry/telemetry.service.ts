import { prisma } from '../../database/prisma';
import { Errors } from '../../shared/errors/app-error';
import { paginationMeta, toSkipTake } from '../../shared/utils/pagination';
import { notifyRoles } from '../notifications/notifications.service';
import { CreateTelemetryBody } from './telemetry.schema';

const LOW_BATTERY_THRESHOLD = 20;

export class TelemetryService {
  async listByRobot(robotId: string, page: number, limit: number) {
    const robot = await prisma.robot.findUnique({ where: { id: robotId } });
    if (!robot) {
      throw Errors.notFound('Robot');
    }

    const [items, total] = await Promise.all([
      prisma.telemetry.findMany({
        where: { robotId },
        ...toSkipTake(page, limit),
        orderBy: { recordedAt: 'desc' },
      }),
      prisma.telemetry.count({ where: { robotId } }),
    ]);

    return { items, pagination: paginationMeta(page, limit, total) };
  }

  async getById(id: string) {
    const record = await prisma.telemetry.findUnique({ where: { id } });
    if (!record) {
      throw Errors.notFound('Telemetry');
    }
    return record;
  }

  async record(robotId: string, input: CreateTelemetryBody) {
    const robot = await prisma.robot.findUnique({ where: { id: robotId } });
    if (!robot) {
      throw Errors.notFound('Robot');
    }

    const recordedAt = input.recordedAt ? new Date(input.recordedAt) : new Date();

    const telemetry = await prisma.telemetry.create({
      data: {
        robotId,
        batteryLevel: input.batteryLevel,
        temperature: input.temperature,
        latitude: input.latitude,
        longitude: input.longitude,
        speed: input.speed,
        recordedAt,
      },
    });

    await prisma.robot.update({
      where: { id: robotId },
      data: {
        batteryLevel: input.batteryLevel,
        latitude: input.latitude,
        longitude: input.longitude,
        lastSeenAt: recordedAt,
      },
    });

    if (input.batteryLevel <= LOW_BATTERY_THRESHOLD) {
      await notifyRoles(['ADMIN', 'MANAGER'], 'Low battery alert', `Robot ${robot.serialNumber} battery is at ${input.batteryLevel}%.`);
    }

    return telemetry;
  }
}
