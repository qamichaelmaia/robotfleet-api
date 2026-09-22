import { Type, Static } from '@sinclair/typebox';
import { paginatedResponse } from '../../shared/schemas/common';

export const MaintenanceTypeEnum = Type.Union([
  Type.Literal('PREVENTIVE'),
  Type.Literal('CORRECTIVE'),
  Type.Literal('INSPECTION'),
]);

export const MaintenanceStatusEnum = Type.Union([
  Type.Literal('SCHEDULED'),
  Type.Literal('IN_PROGRESS'),
  Type.Literal('COMPLETED'),
  Type.Literal('CANCELLED'),
]);

export const MaintenanceSchema = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    robotId: Type.String({ format: 'uuid' }),
    type: MaintenanceTypeEnum,
    description: Type.Union([Type.String(), Type.Null()]),
    status: MaintenanceStatusEnum,
    scheduledAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
    startedAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
    completedAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
    performedBy: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' }),
  },
  { $id: 'Maintenance' },
);

export const MaintenanceListQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  status: Type.Optional(MaintenanceStatusEnum),
  robotId: Type.Optional(Type.String({ format: 'uuid' })),
});
export type MaintenanceListQuery = Static<typeof MaintenanceListQuerySchema>;

export const MaintenanceListResponseSchema = paginatedResponse(MaintenanceSchema);

export const CreateMaintenanceBodySchema = Type.Object({
  robotId: Type.String({ format: 'uuid' }),
  type: MaintenanceTypeEnum,
  description: Type.Optional(Type.String()),
  scheduledAt: Type.Optional(Type.String({ format: 'date-time' })),
});
export type CreateMaintenanceBody = Static<typeof CreateMaintenanceBodySchema>;

export const ReplaceMaintenanceBodySchema = Type.Object({
  type: MaintenanceTypeEnum,
  description: Type.Optional(Type.String()),
  scheduledAt: Type.Optional(Type.String({ format: 'date-time' })),
});
export type ReplaceMaintenanceBody = Static<typeof ReplaceMaintenanceBodySchema>;

export const UpdateMaintenanceBodySchema = Type.Partial(ReplaceMaintenanceBodySchema);
export type UpdateMaintenanceBody = Static<typeof UpdateMaintenanceBodySchema>;
