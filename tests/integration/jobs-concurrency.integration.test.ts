import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/database/prisma';

/**
 * Verifies that a robot cannot be assigned to two jobs concurrently: only one of two
 * racing requests should succeed, the other must receive 409 Conflict.
 */
describe('Concurrent job assignment (integration)', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let robotId: string;
  let jobAId: string;
  let jobBId: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'admin@robotfleet.dev', password: 'Password123!' },
    });
    adminToken = login.json().accessToken;

    const robot = await prisma.robot.create({
      data: { serialNumber: `TEST-${randomUUID()}`, name: 'Test Robot', model: 'TX-1', status: 'AVAILABLE', batteryLevel: 100 },
    });
    robotId = robot.id;

    const jobA = await prisma.job.create({
      data: { title: 'Job A', createdBy: (await prisma.user.findUniqueOrThrow({ where: { email: 'admin@robotfleet.dev' } })).id },
    });
    const jobB = await prisma.job.create({
      data: { title: 'Job B', createdBy: (await prisma.user.findUniqueOrThrow({ where: { email: 'admin@robotfleet.dev' } })).id },
    });
    jobAId = jobA.id;
    jobBId = jobB.id;
  });

  afterAll(async () => {
    await prisma.job.deleteMany({ where: { id: { in: [jobAId, jobBId] } } });
    await prisma.robot.delete({ where: { id: robotId } });
    await app.close();
  });

  it('allows only one of two concurrent assign requests to succeed', async () => {
    const [responseA, responseB] = await Promise.all([
      app.inject({
        method: 'POST',
        url: `/api/v1/jobs/${jobAId}/assign`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { robotId },
      }),
      app.inject({
        method: 'POST',
        url: `/api/v1/jobs/${jobBId}/assign`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { robotId },
      }),
    ]);

    const statusCodes = [responseA.statusCode, responseB.statusCode].sort();
    expect(statusCodes).toEqual([200, 409]);
  });
});
