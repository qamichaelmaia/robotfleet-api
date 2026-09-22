export interface ProblemDetailsInit {
  type: string;
  title: string;
  status: number;
  code: string;
  detail: string;
  errors?: Array<{ field: string; message: string }>;
}

export class AppError extends Error {
  public readonly type: string;
  public readonly title: string;
  public readonly status: number;
  public readonly code: string;
  public readonly detail: string;
  public readonly errors?: Array<{ field: string; message: string }>;

  constructor(init: ProblemDetailsInit) {
    super(init.detail);
    this.type = init.type;
    this.title = init.title;
    this.status = init.status;
    this.code = init.code;
    this.detail = init.detail;
    this.errors = init.errors;
  }

  toProblemDetails(traceId: string) {
    return {
      type: this.type,
      title: this.title,
      status: this.status,
      code: this.code,
      detail: this.detail,
      traceId,
      ...(this.errors ? { errors: this.errors } : {}),
    };
  }
}

const errorsBase = 'https://api.robotfleet.dev/errors';

export const Errors = {
  notFound: (entity: string, detail?: string) =>
    new AppError({
      type: `${errorsBase}/${entity.toLowerCase()}-not-found`,
      title: `${entity} Not Found`,
      status: 404,
      code: `${entity.toUpperCase()}_NOT_FOUND`,
      detail: detail ?? `The requested ${entity.toLowerCase()} does not exist.`,
    }),
  validation: (detail: string, fieldErrors?: Array<{ field: string; message: string }>) =>
    new AppError({
      type: `${errorsBase}/validation-error`,
      title: 'Validation Error',
      status: 422,
      code: 'VALIDATION_ERROR',
      detail,
      errors: fieldErrors,
    }),
  badRequest: (detail: string) =>
    new AppError({
      type: `${errorsBase}/bad-request`,
      title: 'Bad Request',
      status: 400,
      code: 'BAD_REQUEST',
      detail,
    }),
  unauthorized: (detail = 'Authentication is required to access this resource.') =>
    new AppError({
      type: `${errorsBase}/unauthorized`,
      title: 'Unauthorized',
      status: 401,
      code: 'UNAUTHORIZED',
      detail,
    }),
  forbidden: (detail = 'You do not have permission to perform this action.') =>
    new AppError({
      type: `${errorsBase}/forbidden`,
      title: 'Forbidden',
      status: 403,
      code: 'FORBIDDEN',
      detail,
    }),
  conflict: (detail: string, code = 'CONFLICT') =>
    new AppError({
      type: `${errorsBase}/conflict`,
      title: 'Conflict',
      status: 409,
      code,
      detail,
    }),
  tooManyRequests: (detail = 'Rate limit exceeded. Please try again later.') =>
    new AppError({
      type: `${errorsBase}/rate-limit-exceeded`,
      title: 'Too Many Requests',
      status: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      detail,
    }),
  internal: (detail = 'An unexpected error occurred.') =>
    new AppError({
      type: `${errorsBase}/internal-server-error`,
      title: 'Internal Server Error',
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      detail,
    }),
};
