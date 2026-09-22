import { AuditLog } from '@prisma/client';

export function toAuditLogPublic(log: AuditLog) {
  return {
    id: log.id,
    actorId: log.actorId,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    before: log.before ?? undefined,
    after: log.after ?? undefined,
    timestamp: log.timestamp.toISOString(),
    ipAddress: log.ipAddress,
  };
}
