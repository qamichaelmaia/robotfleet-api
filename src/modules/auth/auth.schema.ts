import { Type, Static } from '@sinclair/typebox';

export const UserRoleEnum = Type.Union([
  Type.Literal('ADMIN'),
  Type.Literal('MANAGER'),
  Type.Literal('OPERATOR'),
  Type.Literal('VIEWER'),
]);

export const UserStatusEnum = Type.Union([
  Type.Literal('ACTIVE'),
  Type.Literal('INACTIVE'),
  Type.Literal('SUSPENDED'),
]);

export const UserPublicSchema = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    name: Type.String(),
    email: Type.String({ format: 'email' }),
    role: UserRoleEnum,
    status: UserStatusEnum,
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' }),
  },
  { $id: 'User' },
);

export const RegisterBodySchema = Type.Object({
  name: Type.String({ minLength: 2, maxLength: 120 }),
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 8, maxLength: 72 }),
});
export type RegisterBody = Static<typeof RegisterBodySchema>;

export const LoginBodySchema = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 1 }),
});
export type LoginBody = Static<typeof LoginBodySchema>;

export const RefreshBodySchema = Type.Object({
  refreshToken: Type.String(),
});
export type RefreshBody = Static<typeof RefreshBodySchema>;

export const AuthTokensSchema = Type.Object({
  accessToken: Type.String(),
  refreshToken: Type.String(),
  expiresIn: Type.Integer(),
});
