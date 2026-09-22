import { prisma } from '../../database/prisma';
import { AppError } from '../errors/app-error';

export async function withIdempotency<T>(
  key: string | undefined,
  method: string,
  path: string,
  handler: () => Promise<{ statusCode: number; body: T }>,
): Promise<{ statusCode: number; body: T; replayed: boolean }> {
  if (!key) {
    const result = await handler();
    return { ...result, replayed: false };
  }

  const existing = await prisma.idempotencyKey.findUnique({ where: { key } });
  if (existing) {
    if (existing.method !== method || existing.path !== path) {
      throw new AppError({
        type: 'https://api.robotfleet.dev/errors/idempotency-key-conflict',
        title: 'Idempotency Key Conflict',
        status: 409,
        code: 'IDEMPOTENCY_KEY_CONFLICT',
        detail: 'This idempotency key was already used for a different request.',
      });
    }
    return { statusCode: existing.statusCode, body: existing.responseBody as T, replayed: true };
  }

  const result = await handler();

  await prisma.idempotencyKey.create({
    data: {
      key,
      method,
      path,
      statusCode: result.statusCode,
      responseBody: result.body as object,
    },
  });

  return { ...result, replayed: false };
}
