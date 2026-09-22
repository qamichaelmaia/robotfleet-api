import { Type, Static } from '@sinclair/typebox';
import { paginatedResponse } from '../../shared/schemas/common';

export const IncidentSeverityEnum = Type.Union([
  Type.Literal('LOW'),
  Type.Literal('MEDIUM'),
  Type.Literal('HIGH'),
  Type.Literal('CRITICAL'),
]);

export const IncidentStatusEnum = Type.Union([
  Type.Literal('OPEN'),
  Type.Literal('INVESTIGATING'),
  Type.Literal('RESOLVED'),
  Type.Literal('CLOSED'),
]);

export const IncidentSchema = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    robotId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
    jobId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
    type: Type.String(),
    severity: IncidentSeverityEnum,
    description: Type.String(),
    status: IncidentStatusEnum,
    createdAt: Type.String({ format: 'date-time' }),
    resolvedAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
    resolvedBy: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
  },
  { $id: 'Incident' },
);

export const IncidentListQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  status: Type.Optional(IncidentStatusEnum),
  severity: Type.Optional(IncidentSeverityEnum),
  robotId: Type.Optional(Type.String({ format: 'uuid' })),
});
export type IncidentListQuery = Static<typeof IncidentListQuerySchema>;

export const IncidentListResponseSchema = paginatedResponse(IncidentSchema);

export const CreateIncidentBodySchema = Type.Object({
  robotId: Type.Optional(Type.String({ format: 'uuid' })),
  jobId: Type.Optional(Type.String({ format: 'uuid' })),
  type: Type.String({ minLength: 1 }),
  severity: IncidentSeverityEnum,
  description: Type.String({ minLength: 1 }),
});
export type CreateIncidentBody = Static<typeof CreateIncidentBodySchema>;

export const UpdateIncidentBodySchema = Type.Partial(
  Type.Object({
    type: Type.String({ minLength: 1 }),
    description: Type.String({ minLength: 1 }),
    severity: IncidentSeverityEnum,
  }),
);
export type UpdateIncidentBody = Static<typeof UpdateIncidentBodySchema>;
