import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/database/prisma';
import { FastifyInstance } from 'fastify';

/**
 * These tests exercise real HTTP + database behavior and require a running PostgreSQL instance
 * with migrations applied (see `docker compose up -d postgres` and `npm run prisma:migrate`).
 */
describe('Auth flow (integration)', () => {
  let app: FastifyInstance;
  const email = `qa-${randomUUID()}@robotfleet.dev`;
  const password = 'Password123!';

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('registers a new user with VIEWER role by default', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { name: 'QA Tester', email, password },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json().role).toBe('VIEWER');
  });

  it('rejects login with an invalid password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'wrong-password' },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe('UNAUTHORIZED');
  });

  it('logs in with valid credentials and returns access/refresh tokens', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('accessToken');
    expect(body).toHaveProperty('refreshToken');
    expect(body.expiresIn).toBeGreaterThan(0);
  });

  it('rejects access to a private endpoint without a token', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/auth/me' });
    expect(response.statusCode).toBe(401);
  });
});
