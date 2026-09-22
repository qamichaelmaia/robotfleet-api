import { describe, expect, it } from 'vitest';
import { Errors } from '../../src/shared/errors/app-error';

describe('AppError / Errors factory', () => {
  it('builds a 404 problem-details payload for not found errors', () => {
    const error = Errors.notFound('Robot');
    const problem = error.toProblemDetails('trace-1');
    expect(problem.status).toBe(404);
    expect(problem.code).toBe('ROBOT_NOT_FOUND');
    expect(problem.traceId).toBe('trace-1');
  });

  it('builds a 409 conflict with a custom code', () => {
    const error = Errors.conflict('Robot already assigned.', 'ROBOT_CONCURRENT_MODIFICATION');
    expect(error.status).toBe(409);
    expect(error.code).toBe('ROBOT_CONCURRENT_MODIFICATION');
  });

  it('never returns 200 for a business error', () => {
    const errors = [Errors.notFound('Job'), Errors.conflict('x'), Errors.validation('x'), Errors.unauthorized(), Errors.forbidden()];
    for (const error of errors) {
      expect(error.status).not.toBe(200);
      expect(error.status).toBeGreaterThanOrEqual(400);
    }
  });
});
