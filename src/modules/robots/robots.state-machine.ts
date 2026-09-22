import { RobotStatus } from '@prisma/client';
import { Errors } from '../../shared/errors/app-error';

const TRANSITIONS: Record<RobotStatus, RobotStatus[]> = {
  OFFLINE: ['AVAILABLE'],
  AVAILABLE: ['ASSIGNED', 'MAINTENANCE', 'OFFLINE', 'RETIRED'],
  ASSIGNED: ['RUNNING', 'AVAILABLE'],
  RUNNING: ['PAUSED', 'AVAILABLE', 'ERROR'],
  PAUSED: ['RUNNING', 'AVAILABLE'],
  MAINTENANCE: ['AVAILABLE', 'RETIRED'],
  ERROR: ['MAINTENANCE'],
  RETIRED: [],
};

export function assertValidRobotTransition(current: RobotStatus, next: RobotStatus): void {
  const allowed = TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    throw Errors.conflict(
      `Robot cannot transition from ${current} to ${next}.`,
      'INVALID_ROBOT_STATE_TRANSITION',
    );
  }
}
