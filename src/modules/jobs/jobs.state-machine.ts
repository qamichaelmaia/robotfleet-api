import { JobStatus } from '@prisma/client';
import { Errors } from '../../shared/errors/app-error';

const TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  CREATED: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['RUNNING', 'CANCELLED'],
  RUNNING: ['PAUSED', 'COMPLETED', 'FAILED'],
  PAUSED: ['RUNNING'],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
};

export function assertValidJobTransition(current: JobStatus, next: JobStatus): void {
  const allowed = TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    throw Errors.conflict(`Job cannot transition from ${current} to ${next}.`, 'INVALID_JOB_STATE_TRANSITION');
  }
}
