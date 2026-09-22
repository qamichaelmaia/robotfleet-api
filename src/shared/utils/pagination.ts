import { Type, Static } from '@sinclair/typebox';

export const PaginationQuerySchema = Type.Object({
  page: Type.Integer({ minimum: 1, default: 1 }),
  limit: Type.Integer({ minimum: 1, maximum: 100, default: 20 }),
});

export type PaginationQuery = Static<typeof PaginationQuerySchema>;

export function paginationMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export function toSkipTake(page: number, limit: number) {
  return { skip: (page - 1) * limit, take: limit };
}
