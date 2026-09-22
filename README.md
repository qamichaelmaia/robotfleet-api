# Robot Fleet API

Public API for QA engineers to practice **API testing, automation, contract testing, performance testing, security testing** and modern backend quality engineering.

Robot Fleet API simulates a realistic platform for managing a fleet of autonomous robots: users, teams, robots, jobs, maintenance, telemetry, incidents, notifications and audit trails — with real business rules, state machines, concurrency control and consistent error handling.

## Overview

This is **not** a plain CRUD demo. Every resource has real state transitions, validation, authorization rules, and edge cases deliberately built in so QA engineers can design meaningful test suites: boundary values, negative tests, concurrency races, idempotency, and more.

## Features

- JWT authentication with access/refresh tokens and RBAC (`ADMIN`, `MANAGER`, `OPERATOR`, `VIEWER`)
- Robot fleet management with a strict state machine (`OFFLINE → AVAILABLE → ASSIGNED → RUNNING → ...`)
- Job lifecycle management with concurrency-safe robot assignment (optimistic locking)
- Battery-level business rules (min battery to start a job, low-battery alerts)
- Append-only telemetry (no PUT/DELETE)
- Incident workflow with atomic audit log + notification + robot state side effects for CRITICAL incidents
- Maintenance workflow that guards against a robot entering maintenance while a job is running
- Idempotency-Key support on `POST /jobs/{id}/complete`
- Rate limiting (global + strict limits on `/auth/login`, `/auth/register`)
- Standardized [RFC 7807](https://www.rfc-editor.org/rfc/rfc7807)-style problem-details error payloads
- Pagination, filtering and sorting on all list endpoints
- OpenAPI 3.1 specification + Swagger UI at `/docs`
- `/qa-scenarios/*` lab endpoints to simulate delay, errors and rate limiting
- Immutable audit log (admin, read-only)
- Reproducible seed data with predictable test users

## Architecture

```
src/
  app/            Fastify app wiring (see app.ts)
  config/         Environment configuration
  database/       Prisma client
  modules/
    auth/         Register, login, refresh, logout, me
    users/        User CRUD
    teams/        Teams + membership
    robots/       Robot CRUD + operational state machine
    jobs/         Job CRUD + state machine + concurrency-safe assignment
    maintenance/  Maintenance workflow
    telemetry/    Append-only telemetry
    incidents/    Incident workflow
    notifications/
    audit/        Read-only audit trail
    health/       Health/liveness/readiness
    qa-scenarios/ QA lab endpoints (delay/error/rate-limit)
  plugins/        Fastify plugins (auth, security, error handling, openapi, logging)
  routes/         v1 route aggregation
  shared/         Errors, pagination, schemas, idempotency utilities
prisma/           Schema, migrations, seed
tests/
  unit/           Pure business-rule tests (state machines, pagination, errors)
  integration/    Auth, concurrency, idempotency (requires PostgreSQL)
  api/            HTTP-level tests via Fastify inject (health, QA scenarios)
docs/             OpenAPI artifact, QA guide, Postman collection
```

Each module separates **routes → service (business rules) → Prisma (persistence)**. Business rules never live directly in route handlers.

## Tech Stack

Node.js · TypeScript (strict) · Fastify · PostgreSQL · Prisma ORM · OpenAPI 3.1 · Swagger UI · JWT (`@fastify/jwt`) · TypeBox (schema validation, integrated with OpenAPI) · Vitest · Docker / Docker Compose

## Running locally

Prerequisites: Node.js 20+, PostgreSQL (or Docker).

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate   # creates the database schema
npm run prisma:seed      # loads predictable QA data
npm run dev              # starts the API on http://localhost:3000
```

Swagger UI: http://localhost:3000/docs

## Docker

```bash
docker compose up -d
```

This starts PostgreSQL and the API, running migrations and seeding automatically. The API will be available at `http://localhost:3000`.

## Live Demo (Render)

A hosted instance runs on [Render](https://render.com) using the [render.yaml](render.yaml) blueprint (Docker web service + free PostgreSQL):

- API base URL: `https://robot-fleet-api.onrender.com`
- Swagger UI: **https://robot-fleet-api.onrender.com/docs**
- Health check: https://robot-fleet-api.onrender.com/health

Notes on the free plan:
- The instance sleeps after ~15 minutes of inactivity; the first request afterward can take 30-50s to wake up.
- Migrations run automatically on container start (`npx prisma migrate deploy`), but the demo seed (`npm run prisma:seed`) is **not** run automatically on every deploy, to avoid resetting data. Run it once via the Render Shell tab if you need the seeded test users on the hosted instance:
  ```bash
  npm run prisma:seed
  ```

To redeploy: push to `main` — Render auto-builds from the Dockerfile. See [render.yaml](render.yaml) for the full service/database blueprint and environment variables.

## Environment Variables

See [.env.example](.env.example):

| Variable | Description |
|---|---|
| `NODE_ENV` | `development` \| `test` \| `production` |
| `PORT` | HTTP port |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Signing secrets for access/refresh tokens |
| `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Token lifetimes, in seconds |
| `CORS_ORIGIN` | Allowed origin(s), comma-separated, or `*` |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW` | Global rate limit |
| `AUTH_RATE_LIMIT_MAX` / `AUTH_RATE_LIMIT_WINDOW` | Stricter rate limit for `/auth/*` |

Never commit a real `.env` file — it is git-ignored.

## Authentication

```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

Login returns:

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "expiresIn": 900
}
```

Send `Authorization: Bearer <accessToken>` on protected endpoints. Suspended/inactive users are rejected with `403`.

> 🔑 **Which email/password do I use?** See [Test Users](#test-users) below for the seeded accounts (password `Password123!` for all of them), or register your own via `POST /auth/register` (see step-by-step below).

### Step-by-step: authenticating via Swagger UI

Use this flow on either `http://localhost:3000/docs` or the [live demo](#live-demo-render):

1. Open **`/docs`** in your browser.
2. Expand **`POST /api/v1/auth/register`** → click **"Try it out"** → replace the body with:
   ```json
   { "name": "Your Name", "email": "you@example.com", "password": "YourStrongPass123!" }
   ```
   → click **"Execute"**. Expect **`201 Created`** (new users always get the `VIEWER` role).
   - Alternatively, skip this step and use one of the [seeded test users](#test-users) if the database has been seeded.
3. Expand **`POST /api/v1/auth/login`** → "Try it out" → same `email`/`password` → **Execute**. Expect **`200 OK`** with an `accessToken`, `refreshToken` and `expiresIn`.
4. Copy the **`accessToken`** value (without quotes).
5. Click the **"Authorize"** button at the top of the page (padlock icon).
6. Paste the token into the `bearerAuth` field → click **"Authorize"** → **"Close"**.
7. All protected endpoints (shown with a closed padlock 🔒) now automatically send `Authorization: Bearer <token>` when you click "Execute".

> A self-registered user only has the `VIEWER` role (read-only). To exercise write operations (create robots, jobs, etc.) log in with a seeded `ADMIN`/`MANAGER`/`OPERATOR` user instead (see [Test Users](#test-users)), or have an `ADMIN` promote your account via `PATCH /api/v1/users/{id}`.

## Swagger

Interactive documentation, including "Authorize" (bearer token) support, is available at **`/docs`**. A Portuguese-translated copy (title/description/tags; endpoint names and schemas stay in English, as is standard practice) is available at **`/docs/pt`**. The machine-readable spec is exported to [docs/openapi.yaml](docs/openapi.yaml) via `npm run openapi:export`.

## Test Users

Seeded via `npm run prisma:seed` (password for all: `Password123!`):

| Email | Password | Role | Status |
|---|---|---|---|
| admin@robotfleet.dev | Password123! | ADMIN | ACTIVE |
| manager@robotfleet.dev | Password123! | MANAGER | ACTIVE |
| operator@robotfleet.dev | Password123! | OPERATOR | ACTIVE |
| viewer@robotfleet.dev | Password123! | VIEWER | ACTIVE |
| suspended@robotfleet.dev | Password123! | OPERATOR | SUSPENDED (login must fail with 403) |

These only exist after running `npm run prisma:seed` against the target database (local, Docker, or the Render Shell for the [live demo](#live-demo-render)).

## API Resources

`/api/v1/{users, teams, robots, jobs, maintenance, incidents, notifications, audit-logs}` plus `/robots/{id}/telemetry`, `/telemetry/{id}` and `/qa-scenarios/*`. Full parameter/response documentation lives in Swagger.

## Business Rules

- **Robot state machine**: `OFFLINE→AVAILABLE→ASSIGNED→RUNNING⇄PAUSED→AVAILABLE→MAINTENANCE→AVAILABLE`, `ERROR→MAINTENANCE`, `AVAILABLE→OFFLINE/RETIRED`. Invalid transitions return `409` with `INVALID_ROBOT_STATE_TRANSITION`.
- **Job state machine**: `CREATED→ASSIGNED→RUNNING→COMPLETED`, with `PAUSED`, `CANCELLED` and `FAILED` branches. `COMPLETED→RUNNING`, `CANCELLED→RUNNING` and `FAILED→COMPLETED` are always rejected.
- **Battery rules**: 0–100 range enforced at the schema level; a robot below 10% cannot start a job (`409 INSUFFICIENT_BATTERY`); ≤20% triggers a low-battery notification to ADMIN/MANAGER.
- **Concurrency**: robot assignment uses optimistic locking (`version` column) — only one of two racing `POST /jobs/{id}/assign` requests can succeed; the other receives `409 ROBOT_CONCURRENT_MODIFICATION`.
- **Maintenance guard**: a robot cannot enter `MAINTENANCE` while it has a `RUNNING` job, regardless of caller.
- **Telemetry** is append-only: no update/delete endpoints exist.
- **Critical incidents** atomically create the incident, an audit log entry, and (if linked to a robot) move the robot to `ERROR`, then notify ADMIN/MANAGER.

## Error Handling

All errors follow a Problem-Details-style shape:

```json
{
  "type": "https://api.robotfleet.dev/errors/robot-not-found",
  "title": "Robot Not Found",
  "status": 404,
  "code": "ROBOT_NOT_FOUND",
  "detail": "The requested robot does not exist.",
  "traceId": "..."
}
```

## Pagination

All list endpoints return:

```json
{ "data": [], "pagination": { "page": 1, "limit": 20, "total": 143, "totalPages": 8 } }
```

## Idempotency

Send `Idempotency-Key: <uuid>` on `POST /jobs/{id}/complete` to safely retry the request without duplicating the operation, its audit log, or side effects.

## Rate Limiting

Global rate limiting applies to all routes; `/auth/login` and `/auth/register` use a stricter limit. Exceeding it returns `429` with `RATE_LIMIT_EXCEEDED`. `/qa-scenarios/rate-limit` lets you practice this deterministically (3 requests/minute).

## Testing

```bash
npm test              # everything
npm run test:unit      # pure business-rule tests, no DB required
npm run test:integration
npm run test:api
```

Integration and DB-backed API tests require PostgreSQL (`docker compose up -d postgres` + `npm run prisma:migrate` + `npm run prisma:seed`).

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`): install → typecheck → migrate → seed → unit → integration → api tests → OpenAPI export → build.

## Roadmap

- **V1 (current)** — REST, PostgreSQL, JWT, RBAC, Swagger, OpenAPI, business rules, audit, Docker.
- **V2** — Postman/Newman, PactumJS, Playwright API automation, Allure reporting.
- **V3** — Contract Testing Roadmap (below).
- **V4** — Event Contracts (RabbitMQ/Kafka, producer/consumer contracts).
- **V5** — Performance Testing Roadmap (below).
- **V6** — Security Testing Roadmap (below).
- **V7** — Resilience/Chaos (timeouts, retries, circuit breakers, chaos scenarios).

### Contract Testing Roadmap

The module boundaries (`Robot`, `Job`, `Telemetry`, `Notification`, `Maintenance`) are modeled so that future Pact consumer/provider contracts (e.g. `Job Service → Robot Service: GET /robots/{id}`) can be introduced without restructuring the codebase.

### Performance Testing Roadmap

Pagination, filtering and seeded telemetry volume are designed to support k6 load/stress/spike/soak testing against list and telemetry endpoints without artificial delays polluting normal traffic.

### Security Testing Roadmap

JWT, RBAC, rate limiting, Helmet security headers, and input validation are in place as a foundation for OWASP API Security testing (authZ abuse, token abuse, fuzzing).

## Contribution Guide

1. Fork/branch from `main`.
2. Run `npm run typecheck`, `npm test` and `npm run build` before opening a PR.
3. Keep business rules in services, not routes; keep schemas reusable.
4. Update `docs/openapi.yaml` (`npm run openapi:export`) whenever the API surface changes.

## License

MIT
