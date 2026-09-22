import { Type, Static } from '@sinclair/typebox';
import { paginatedResponse } from '../../shared/schemas/common';

export const JobPriorityEnum = Type.Union([
  Type.Literal('LOW'),
  Type.Literal('MEDIUM'),
  Type.Literal('HIGH'),
  Type.Literal('CRITICAL'),
]);

export const JobStatusEnum = Type.Union([
  Type.Literal('CREATED'),
  Type.Literal('ASSIGNED'),
  Type.Literal('RUNNING'),
  Type.Literal('PAUSED'),
  Type.Literal('COMPLETED'),
  Type.Literal('FAILED'),
  Type.Literal('CANCELLED'),
]);

export const JobSchema = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    title: Type.String(),
    description: Type.Union([Type.String(), Type.Null()]),
    priority: JobPriorityEnum,
    status: JobStatusEnum,
    robotId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
    createdBy: Type.String({ format: 'uuid' }),
    scheduledAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
    startedAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
    completedAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' }),
  },
  { $id: 'Job' },
);

export const JobListQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  status: Type.Optional(JobStatusEnum),
  priority: Type.Optional(JobPriorityEnum),
  robotId: Type.Optional(Type.String({ format: 'uuid' })),
});
export type JobListQuery = Static<typeof JobListQuerySchema>;

export const JobListResponseSchema = paginatedResponse(JobSchema);

export const CreateJobBodySchema = Type.Object({
  title: Type.String({ minLength: 1 }),
  description: Type.Optional(Type.String()),
  priority: Type.Optional(JobPriorityEnum),
  scheduledAt: Type.Optional(Type.String({ format: 'date-time' })),
});
export type CreateJobBody = Static<typeof CreateJobBodySchema>;

export const ReplaceJobBodySchema = Type.Object({
  title: Type.String({ minLength: 1 }),
  description: Type.Optional(Type.String()),
  priority: JobPriorityEnum,
  scheduledAt: Type.Optional(Type.String({ format: 'date-time' })),
});
export type ReplaceJobBody = Static<typeof ReplaceJobBodySchema>;

export const UpdateJobBodySchema = Type.Partial(ReplaceJobBodySchema);
export type UpdateJobBody = Static<typeof UpdateJobBodySchema>;

export const AssignJobBodySchema = Type.Object({
  robotId: Type.String({ format: 'uuid' }),
});
export type AssignJobBody = Static<typeof AssignJobBodySchema>;

export const IdempotencyHeaderSchema = Type.Object({
  'idempotency-key': Type.Optional(Type.String({ format: 'uuid' })),
});
