import { Type, Static } from '@sinclair/typebox';
import { paginatedResponse } from '../../shared/schemas/common';

export const NotificationTypeEnum = Type.Union([
  Type.Literal('INFO'),
  Type.Literal('WARNING'),
  Type.Literal('CRITICAL'),
]);

export const NotificationSchema = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    userId: Type.String({ format: 'uuid' }),
    type: NotificationTypeEnum,
    title: Type.String(),
    message: Type.String(),
    read: Type.Boolean(),
    createdAt: Type.String({ format: 'date-time' }),
    readAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
  },
  { $id: 'Notification' },
);

export const NotificationListQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 20 })),
  read: Type.Optional(Type.Boolean()),
});
export type NotificationListQuery = Static<typeof NotificationListQuerySchema>;

export const NotificationListResponseSchema = paginatedResponse(NotificationSchema);
