import { Type, Static } from '@sinclair/typebox';
import { UserPublicSchema, UserRoleEnum, UserStatusEnum } from '../auth/auth.schema';
import { paginatedResponse } from '../../shared/schemas/common';

export { UserPublicSchema };

export const UserListQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  status: Type.Optional(UserStatusEnum),
  role: Type.Optional(UserRoleEnum),
  search: Type.Optional(Type.String()),
  sort: Type.Optional(Type.String({ default: 'createdAt' })),
});
export type UserListQuery = Static<typeof UserListQuerySchema>;

export const UserListResponseSchema = paginatedResponse(UserPublicSchema);

export const CreateUserBodySchema = Type.Object({
  name: Type.String({ minLength: 2, maxLength: 120 }),
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 8, maxLength: 72 }),
  role: Type.Optional(UserRoleEnum),
});
export type CreateUserBody = Static<typeof CreateUserBodySchema>;

export const ReplaceUserBodySchema = Type.Object({
  name: Type.String({ minLength: 2, maxLength: 120 }),
  email: Type.String({ format: 'email' }),
  role: UserRoleEnum,
  status: UserStatusEnum,
});
export type ReplaceUserBody = Static<typeof ReplaceUserBodySchema>;

export const UpdateUserBodySchema = Type.Partial(ReplaceUserBodySchema);
export type UpdateUserBody = Static<typeof UpdateUserBodySchema>;
