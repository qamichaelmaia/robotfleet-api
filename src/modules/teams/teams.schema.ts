import { Type, Static } from '@sinclair/typebox';
import { paginatedResponse } from '../../shared/schemas/common';
import { UserPublicSchema } from '../auth/auth.schema';

export const TeamStatusEnum = Type.Union([Type.Literal('ACTIVE'), Type.Literal('INACTIVE')]);

export const TeamSchema = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    name: Type.String(),
    description: Type.Union([Type.String(), Type.Null()]),
    leaderId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
    status: TeamStatusEnum,
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' }),
  },
  { $id: 'Team' },
);

export const TeamListQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  status: Type.Optional(TeamStatusEnum),
  search: Type.Optional(Type.String()),
});
export type TeamListQuery = Static<typeof TeamListQuerySchema>;

export const TeamListResponseSchema = paginatedResponse(TeamSchema);

export const CreateTeamBodySchema = Type.Object({
  name: Type.String({ minLength: 2, maxLength: 120 }),
  description: Type.Optional(Type.String()),
  leaderId: Type.Optional(Type.String({ format: 'uuid' })),
});
export type CreateTeamBody = Static<typeof CreateTeamBodySchema>;

export const ReplaceTeamBodySchema = Type.Object({
  name: Type.String({ minLength: 2, maxLength: 120 }),
  description: Type.Optional(Type.String()),
  leaderId: Type.Optional(Type.String({ format: 'uuid' })),
  status: TeamStatusEnum,
});
export type ReplaceTeamBody = Static<typeof ReplaceTeamBodySchema>;

export const UpdateTeamBodySchema = Type.Partial(ReplaceTeamBodySchema);
export type UpdateTeamBody = Static<typeof UpdateTeamBodySchema>;

export const AddTeamMemberBodySchema = Type.Object({
  userId: Type.String({ format: 'uuid' }),
});
export type AddTeamMemberBody = Static<typeof AddTeamMemberBodySchema>;

export const TeamMemberListResponseSchema = paginatedResponse(UserPublicSchema);
