import { describe, expect, it } from 'vitest';
import { assertValidRobotTransition } from '../../src/modules/robots/robots.state-machine';
import { AppError } from '../../src/shared/errors/app-error';

describe('Robot state machine', () => {
  it('allows OFFLINE to AVAILABLE transition', () => {
    expect(() => assertValidRobotTransition('OFFLINE', 'AVAILABLE')).not.toThrow();
  });

  it('allows AVAILABLE to ASSIGNED transition', () => {
    expect(() => assertValidRobotTransition('AVAILABLE', 'ASSIGNED')).not.toThrow();
  });

  it('allows RUNNING to PAUSED and PAUSED to RUNNING', () => {
    expect(() => assertValidRobotTransition('RUNNING', 'PAUSED')).not.toThrow();
    expect(() => assertValidRobotTransition('PAUSED', 'RUNNING')).not.toThrow();
  });

  it('allows ERROR to MAINTENANCE transition', () => {
    expect(() => assertValidRobotTransition('ERROR', 'MAINTENANCE')).not.toThrow();
  });

  it('does not allow an arbitrary transition from RETIRED', () => {
    expect(() => assertValidRobotTransition('RETIRED', 'AVAILABLE')).toThrow(AppError);
  });

  it('does not allow OFFLINE to RUNNING directly', () => {
    try {
      assertValidRobotTransition('OFFLINE', 'RUNNING');
      throw new Error('expected to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).status).toBe(409);
      expect((error as AppError).code).toBe('INVALID_ROBOT_STATE_TRANSITION');
    }
  });
});
