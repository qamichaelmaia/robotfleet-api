import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/database/prisma';

describe('Job completion idempotency (integration)', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let robotId: string;
  let jobId: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'admin@robotfleet.dev', password: 'Password123!' },
    });
    adminToken = login.json().accessToken;

    const adminId = (await prisma.user.findUniqueOrThrow({ where: { email: 'admin@robotfleet.dev' } })).id;
    const robot = await prisma.robot.create({
      data: { serialNumber: `TEST-${randomUUID()}`, name: 'Idempotency Robot', model: 'TX-1', status: 'RUNNING', batteryLevel: 100 },
    });
    robotId = robot.id;

    const job = await prisma.job.create({
      data: { title: 'Completion Job', status: 'RUNNING', robotId, createdBy: adminId, startedAt: new Date() },
    });
    jobId = job.id;
  });

  afterAll(async () => {
    await prisma.job.deleteMany({ where: { id: jobId } });
    await prisma.robot.deleteMany({ where: { id: robotId } });
    await app.close();
  });

  it('does not duplicate the completion when the same Idempotency-Key is replayed', async () => {
    const idempotencyKey = randomUUID();

    const first = await app.inject({
      method: 'POST',
      url: `/api/v1/jobs/${jobId}/complete`,
      headers: { authorization: `Bearer ${adminToken}`, 'idempotency-key': idempotencyKey },
    });
    expect(first.statusCode).toBe(200);
    expect(first.json().status).toBe('COMPLETED');

    const second = await app.inject({
      method: 'POST',
      url: `/api/v1/jobs/${jobId}/complete`,
      headers: { authorization: `Bearer ${adminToken}`, 'idempotency-key': idempotencyKey },
    });
    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual(first.json());

    const completeAuditLogs = await prisma.auditLog.count({ where: { entity: 'Job', entityId: jobId, action: 'COMPLETE_JOB' } });
    expect(completeAuditLogs).toBe(1);
  });
});
