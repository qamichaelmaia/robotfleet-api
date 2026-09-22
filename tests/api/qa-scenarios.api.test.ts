import { describe, expect, it, afterAll } from 'vitest';
import { buildApp } from '../../src/app';

describe('QA scenario lab endpoints', () => {
  const app = buildApp();

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/qa-scenarios/health returns ok without authentication', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/qa-scenarios/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('GET /api/v1/qa-scenarios/error returns a structured 500 problem-details payload', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/qa-scenarios/error' });
    expect(response.statusCode).toBe(500);
    const body = response.json();
    expect(body.status).toBe(500);
    expect(body.code).toBe('INTERNAL_SERVER_ERROR');
    expect(body.traceId).toBeDefined();
  });

  it('GET /api/v1/qa-scenarios/delay respects the requested delay window', async () => {
    const start = Date.now();
    const response = await app.inject({ method: 'GET', url: '/api/v1/qa-scenarios/delay?ms=50' });
    expect(response.statusCode).toBe(200);
    expect(Date.now() - start).toBeGreaterThanOrEqual(50);
  });

  it('GET /api/v1/qa-scenarios/rate-limit returns 429 after exceeding the configured limit', async () => {
    const results = [];
    for (let i = 0; i < 5; i += 1) {
      results.push(await app.inject({ method: 'GET', url: '/api/v1/qa-scenarios/rate-limit' }));
    }
    const statusCodes = results.map((r) => r.statusCode);
    expect(statusCodes).toContain(429);
  });

  it('GET /api/v1/unknown-route returns a structured 404 problem-details payload', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/unknown-route' });
    expect(response.statusCode).toBe(404);
    expect(response.json().code).toBe('ROUTE_NOT_FOUND');
  });
});
