import { Type, Static } from '@sinclair/typebox';
import { paginatedResponse } from '../../shared/schemas/common';

export const AuditLogSchema = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    actorId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
    action: Type.String(),
    entity: Type.String(),
    entityId: Type.String(),
    before: Type.Optional(Type.Unknown()),
    after: Type.Optional(Type.Unknown()),
    timestamp: Type.String({ format: 'date-time' }),
    ipAddress: Type.Union([Type.String(), Type.Null()]),
  },
  { $id: 'AuditLog' },
);

export const AuditLogListQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  entity: Type.Optional(Type.String()),
  entityId: Type.Optional(Type.String()),
  actorId: Type.Optional(Type.String({ format: 'uuid' })),
});
export type AuditLogListQuery = Static<typeof AuditLogListQuerySchema>;

export const AuditLogListResponseSchema = paginatedResponse(AuditLogSchema);
