import { describe, expect, it } from 'vitest';
import { assertValidJobTransition } from '../../src/modules/jobs/jobs.state-machine';
import { AppError } from '../../src/shared/errors/app-error';

describe('Job state machine', () => {
  it('allows the happy path CREATED -> ASSIGNED -> RUNNING -> COMPLETED', () => {
    expect(() => assertValidJobTransition('CREATED', 'ASSIGNED')).not.toThrow();
    expect(() => assertValidJobTransition('ASSIGNED', 'RUNNING')).not.toThrow();
    expect(() => assertValidJobTransition('RUNNING', 'COMPLETED')).not.toThrow();
  });

  it('allows RUNNING to PAUSED and back to RUNNING', () => {
    expect(() => assertValidJobTransition('RUNNING', 'PAUSED')).not.toThrow();
    expect(() => assertValidJobTransition('PAUSED', 'RUNNING')).not.toThrow();
  });

  it('allows cancellation from CREATED and ASSIGNED', () => {
    expect(() => assertValidJobTransition('CREATED', 'CANCELLED')).not.toThrow();
    expect(() => assertValidJobTransition('ASSIGNED', 'CANCELLED')).not.toThrow();
  });

  it('does not allow COMPLETED to RUNNING', () => {
    expect(() => assertValidJobTransition('COMPLETED', 'RUNNING')).toThrow(AppError);
  });

  it('does not allow CANCELLED to RUNNING', () => {
    expect(() => assertValidJobTransition('CANCELLED', 'RUNNING')).toThrow(AppError);
  });

  it('does not allow FAILED to COMPLETED', () => {
    expect(() => assertValidJobTransition('FAILED', 'COMPLETED')).toThrow(AppError);
  });
});
