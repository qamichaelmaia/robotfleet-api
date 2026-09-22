import { Type, Static } from '@sinclair/typebox';
import { paginatedResponse } from '../../shared/schemas/common';

export const RobotStatusEnum = Type.Union([
  Type.Literal('AVAILABLE'),
  Type.Literal('ASSIGNED'),
  Type.Literal('RUNNING'),
  Type.Literal('PAUSED'),
  Type.Literal('MAINTENANCE'),
  Type.Literal('ERROR'),
  Type.Literal('OFFLINE'),
  Type.Literal('RETIRED'),
]);

export const RobotSchema = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    serialNumber: Type.String(),
    name: Type.String(),
    model: Type.String(),
    status: RobotStatusEnum,
    batteryLevel: Type.Integer({ minimum: 0, maximum: 100 }),
    latitude: Type.Union([Type.Number(), Type.Null()]),
    longitude: Type.Union([Type.Number(), Type.Null()]),
    teamId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
    lastSeenAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' }),
  },
  { $id: 'Robot' },
);

export const RobotListQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  status: Type.Optional(RobotStatusEnum),
  teamId: Type.Optional(Type.String({ format: 'uuid' })),
  model: Type.Optional(Type.String()),
  minBattery: Type.Optional(Type.Integer({ minimum: 0, maximum: 100 })),
  maxBattery: Type.Optional(Type.Integer({ minimum: 0, maximum: 100 })),
});
export type RobotListQuery = Static<typeof RobotListQuerySchema>;

export const RobotListResponseSchema = paginatedResponse(RobotSchema);

export const CreateRobotBodySchema = Type.Object({
  serialNumber: Type.String({ minLength: 1 }),
  name: Type.String({ minLength: 1 }),
  model: Type.String({ minLength: 1 }),
  teamId: Type.Optional(Type.String({ format: 'uuid' })),
  batteryLevel: Type.Optional(Type.Integer({ minimum: 0, maximum: 100 })),
  latitude: Type.Optional(Type.Number()),
  longitude: Type.Optional(Type.Number()),
});
export type CreateRobotBody = Static<typeof CreateRobotBodySchema>;

export const ReplaceRobotBodySchema = Type.Object({
  name: Type.String({ minLength: 1 }),
  model: Type.String({ minLength: 1 }),
  teamId: Type.Optional(Type.String({ format: 'uuid' })),
  latitude: Type.Optional(Type.Number()),
  longitude: Type.Optional(Type.Number()),
});
export type ReplaceRobotBody = Static<typeof ReplaceRobotBodySchema>;

export const UpdateRobotBodySchema = Type.Partial(ReplaceRobotBodySchema);
export type UpdateRobotBody = Static<typeof UpdateRobotBodySchema>;
