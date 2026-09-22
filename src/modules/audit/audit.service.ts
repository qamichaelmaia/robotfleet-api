import { prisma } from '../../database/prisma';

interface CreateAuditLogInput {
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string | null;
}

export async function recordAuditLog(input: CreateAuditLogInput) {
  return prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      before: input.before === undefined ? undefined : (input.before as object),
      after: input.after === undefined ? undefined : (input.after as object),
      ipAddress: input.ipAddress ?? null,
    },
  });
}
