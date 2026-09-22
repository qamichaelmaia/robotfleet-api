import { Job, Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { Errors } from '../../shared/errors/app-error';
import { paginationMeta, toSkipTake } from '../../shared/utils/pagination';
import { recordAuditLog } from '../audit/audit.service';
import { assertValidJobTransition } from './jobs.state-machine';
import { AssignJobBody, CreateJobBody, JobListQuery, ReplaceJobBody, UpdateJobBody } from './jobs.schema';

const MIN_BATTERY_TO_START = 10;

export class JobsService {
  async list(query: JobListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.JobWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.robotId ? { robotId: query.robotId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.job.findMany({ where, ...toSkipTake(page, limit), orderBy: { createdAt: 'asc' } }),
      prisma.job.count({ where }),
    ]);

    return { items, pagination: paginationMeta(page, limit, total) };
  }

  async getById(id: string): Promise<Job> {
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) {
      throw Errors.notFound('Job');
    }
    return job;
  }

  async create(input: CreateJobBody, actorId: string) {
    const job = await prisma.job.create({
      data: {
        title: input.title,
        description: input.description,
        priority: input.priority ?? 'MEDIUM',
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
        createdBy: actorId,
      },
    });
    await recordAuditLog({ actorId, action: 'CREATE_JOB', entity: 'Job', entityId: job.id, after: job });
    return job;
  }

  async replace(id: string, input: ReplaceJobBody, actorId: string) {
    const before = await this.getById(id);
    const job = await prisma.job.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        priority: input.priority,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      },
    });
    await recordAuditLog({ actorId, action: 'UPDATE_JOB', entity: 'Job', entityId: id, before, after: job });
    return job;
  }

  async update(id: string, input: UpdateJobBody, actorId: string) {
    const before = await this.getById(id);
    const job = await prisma.job.update({
      where: { id },
      data: {
        ...input,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      },
    });
    await recordAuditLog({ actorId, action: 'UPDATE_JOB', entity: 'Job', entityId: id, before, after: job });
    return job;
  }

  async remove(id: string, actorId: string) {
    const before = await this.getById(id);
    if (before.status === 'RUNNING' || before.status === 'ASSIGNED') {
      throw Errors.conflict('Job cannot be deleted while active.', 'JOB_HAS_ACTIVE_OPERATIONS');
    }
    await prisma.job.delete({ where: { id } });
    await recordAuditLog({ actorId, action: 'DELETE_JOB', entity: 'Job', entityId: id, before });
  }

  /** Concurrency-safe assignment: only one of two racing requests can claim the robot. */
  async assign(id: string, input: AssignJobBody, actorId: string) {
    const job = await this.getById(id);
    assertValidJobTransition(job.status, 'ASSIGNED');

    const robot = await prisma.robot.findUnique({ where: { id: input.robotId } });
    if (!robot) {
      throw Errors.notFound('Robot');
    }
    if (robot.status === 'RETIRED') {
      throw Errors.conflict('Retired robots cannot receive jobs.', 'ROBOT_RETIRED');
    }
    if (robot.status === 'MAINTENANCE') {
      throw Errors.conflict('Robot is under maintenance and cannot receive jobs.', 'ROBOT_IN_MAINTENANCE');
    }
    if (robot.status !== 'AVAILABLE') {
      throw Errors.conflict(`Robot must be AVAILABLE to be assigned, current status is ${robot.status}.`, 'ROBOT_NOT_AVAILABLE');
    }

    const claim = await prisma.robot.updateMany({
      where: { id: robot.id, version: robot.version, status: 'AVAILABLE' },
      data: { status: 'ASSIGNED', version: { increment: 1 } },
    });

    if (claim.count === 0) {
      throw Errors.conflict(
        'Robot was already assigned to another job by a concurrent request.',
        'ROBOT_CONCURRENT_MODIFICATION',
      );
    }

    const updatedJob = await prisma.job.update({
      where: { id },
      data: { status: 'ASSIGNED', robotId: robot.id },
    });

    await recordAuditLog({ actorId, action: 'ASSIGN_JOB', entity: 'Job', entityId: id, before: job, after: updatedJob });
    return updatedJob;
  }

  async start(id: string, actorId: string) {
    const job = await this.getById(id);
    assertValidJobTransition(job.status, 'RUNNING');
    if (!job.robotId) {
      throw Errors.conflict('Job has no robot assigned.', 'JOB_NOT_ASSIGNED');
    }

    const robot = await prisma.robot.findUniqueOrThrow({ where: { id: job.robotId } });
    if (robot.batteryLevel < MIN_BATTERY_TO_START) {
      throw Errors.conflict(
        `Robot battery level (${robot.batteryLevel}%) is below the minimum required to start a job (${MIN_BATTERY_TO_START}%).`,
        'INSUFFICIENT_BATTERY',
      );
    }
    if (robot.status === 'MAINTENANCE') {
      throw Errors.conflict('Robot is under maintenance and cannot execute jobs.', 'ROBOT_IN_MAINTENANCE');
    }

    await prisma.robot.update({ where: { id: robot.id }, data: { status: 'RUNNING', version: { increment: 1 } } });
    const updatedJob = await prisma.job.update({
      where: { id },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    await recordAuditLog({ actorId, action: 'START_JOB', entity: 'Job', entityId: id, before: job, after: updatedJob });
    return updatedJob;
  }

  async pause(id: string, actorId: string) {
    const job = await this.getById(id);
    assertValidJobTransition(job.status, 'PAUSED');
    if (job.robotId) {
      await prisma.robot.update({ where: { id: job.robotId }, data: { status: 'PAUSED', version: { increment: 1 } } });
    }
    const updatedJob = await prisma.job.update({ where: { id }, data: { status: 'PAUSED' } });
    await recordAuditLog({ actorId, action: 'PAUSE_JOB', entity: 'Job', entityId: id, before: job, after: updatedJob });
    return updatedJob;
  }

  async resume(id: string, actorId: string) {
    const job = await this.getById(id);
    assertValidJobTransition(job.status, 'RUNNING');
    if (job.robotId) {
      await prisma.robot.update({ where: { id: job.robotId }, data: { status: 'RUNNING', version: { increment: 1 } } });
    }
    const updatedJob = await prisma.job.update({ where: { id }, data: { status: 'RUNNING' } });
    await recordAuditLog({ actorId, action: 'RESUME_JOB', entity: 'Job', entityId: id, before: job, after: updatedJob });
    return updatedJob;
  }

  async complete(id: string, actorId: string) {
    const job = await this.getById(id);
    assertValidJobTransition(job.status, 'COMPLETED');
    if (job.robotId) {
      await prisma.robot.update({ where: { id: job.robotId }, data: { status: 'AVAILABLE', version: { increment: 1 } } });
    }
    const updatedJob = await prisma.job.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    await recordAuditLog({ actorId, action: 'COMPLETE_JOB', entity: 'Job', entityId: id, before: job, after: updatedJob });
    return updatedJob;
  }

  async cancel(id: string, actorId: string) {
    const job = await this.getById(id);
    assertValidJobTransition(job.status, 'CANCELLED');
    if (job.robotId) {
      await prisma.robot.update({ where: { id: job.robotId }, data: { status: 'AVAILABLE', version: { increment: 1 } } });
    }
    const updatedJob = await prisma.job.update({ where: { id }, data: { status: 'CANCELLED' } });
    await recordAuditLog({ actorId, action: 'CANCEL_JOB', entity: 'Job', entityId: id, before: job, after: updatedJob });
    return updatedJob;
  }

  async fail(id: string, actorId: string) {
    const job = await this.getById(id);
    assertValidJobTransition(job.status, 'FAILED');
    if (job.robotId) {
      await prisma.robot.update({ where: { id: job.robotId }, data: { status: 'ERROR', version: { increment: 1 } } });
    }
    const updatedJob = await prisma.job.update({ where: { id }, data: { status: 'FAILED' } });
    await recordAuditLog({ actorId, action: 'FAIL_JOB', entity: 'Job', entityId: id, before: job, after: updatedJob });
    return updatedJob;
  }
}
