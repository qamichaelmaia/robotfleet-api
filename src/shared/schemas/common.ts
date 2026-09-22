import { Type } from '@sinclair/typebox';

export const ProblemDetailsSchema = Type.Object(
  {
    type: Type.String(),
    title: Type.String(),
    status: Type.Integer(),
    code: Type.String(),
    detail: Type.String(),
    traceId: Type.String(),
    errors: Type.Optional(
      Type.Array(Type.Object({ field: Type.String(), message: Type.String() })),
    ),
  },
  { $id: 'ProblemDetails' },
);

export const PaginationMetaSchema = Type.Object(
  {
    page: Type.Integer(),
    limit: Type.Integer(),
    total: Type.Integer(),
    totalPages: Type.Integer(),
  },
  { $id: 'PaginationMeta' },
);

export function paginatedResponse(itemSchema: ReturnType<typeof Type.Object> | ReturnType<typeof Type.Ref>) {
  return Type.Object({
    data: Type.Array(itemSchema),
    pagination: Type.Ref(PaginationMetaSchema),
  });
}

export const UuidParamSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
});
