import { Job } from '@prisma/client';

export function toJobPublic(job: Job) {
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    priority: job.priority,
    status: job.status,
    robotId: job.robotId,
    createdBy: job.createdBy,
    scheduledAt: job.scheduledAt ? job.scheduledAt.toISOString() : null,
    startedAt: job.startedAt ? job.startedAt.toISOString() : null,
    completedAt: job.completedAt ? job.completedAt.toISOString() : null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}
