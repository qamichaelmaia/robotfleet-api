import { Maintenance } from '@prisma/client';

export function toMaintenancePublic(record: Maintenance) {
  return {
    id: record.id,
    robotId: record.robotId,
    type: record.type,
    description: record.description,
    status: record.status,
    scheduledAt: record.scheduledAt ? record.scheduledAt.toISOString() : null,
    startedAt: record.startedAt ? record.startedAt.toISOString() : null,
    completedAt: record.completedAt ? record.completedAt.toISOString() : null,
    performedBy: record.performedBy,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
