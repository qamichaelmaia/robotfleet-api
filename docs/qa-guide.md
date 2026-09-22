# QA Guide — Robot Fleet API

This guide shows how to use the Robot Fleet API as a training ground for API testing and automation.

## 1. Getting started

1. Start the API: `docker compose up -d` (or `npm run dev` with a local PostgreSQL).
2. Open Swagger UI: `http://localhost:3000/docs`.
3. Log in with a seeded user (see README "Test Users") via `POST /api/v1/auth/login`.
4. Use the returned `accessToken` with the "Authorize" button in Swagger, or as an `Authorization: Bearer <token>` header.

## 2. Exploratory testing

Start by mapping the domain: users → teams → robots → jobs → maintenance → incidents. Use Swagger's "Try it out" to poke at each endpoint and note:
- which fields are required vs optional,
- which roles can perform which actions,
- what happens when a resource does not exist.

## 3. Functional / negative testing

For every endpoint, test at minimum:
- happy path (valid payload, valid role) → expect 2xx,
- missing/invalid fields → expect `422 VALIDATION_ERROR`,
- unknown id (valid UUID format, non-existent) → expect `404`,
- malformed id (not a UUID) → expect `400`/`422`,
- insufficient role → expect `403`,
- no token → expect `401`.

## 4. Boundary value analysis

Good candidates:
- `batteryLevel`: -1, 0, 10, 20, 100, 101.
- `page`: 0, 1, very large number.
- `limit`: 0, 1, 100, 101.
- `speed`/`temperature`/`latitude`/`longitude` on telemetry: just inside/outside allowed ranges.

## 5. Equivalence partitioning

Partition robot/job/incident statuses into "valid starting states" vs "invalid starting states" for each operation (e.g. `POST /robots/{id}/start` only valid from `ASSIGNED`).

## 6. State transition testing

Use the state diagrams in the README ("Business Rules") to build a transition table and test every edge listed, plus a sample of **disallowed** edges (e.g. `COMPLETED → RUNNING`, `OFFLINE → RUNNING`). Invalid transitions must return `409 Conflict` with a structured error body.

## 7. API automation

Recommended stack for V2: Postman/Newman or PactumJS/Playwright API for scripted regression suites. A starter collection is provided in [docs/postman](postman/).

Suggested automation flow:
1. Register/login → capture tokens.
2. Create a robot and a job.
3. Assign, start, pause, resume, complete — asserting state after each step.
4. Attempt an invalid transition and assert `409`.

## 8. Schema validation

Validate every response against the OpenAPI schemas in [docs/openapi.yaml](openapi.yaml) (e.g. using `ajv` or Postman's schema test scripts).

## 9. Authorization testing

Verify role matrices, e.g.:
- `VIEWER` can `GET` but not `POST/PUT/PATCH/DELETE` on `/users`.
- Only `ADMIN` can `DELETE /robots/{id}` or read `/audit-logs`.
- A `SUSPENDED` or `INACTIVE` user must be rejected even with a technically valid token.

## 10. Idempotency testing

Send `POST /jobs/{id}/complete` twice with the same `Idempotency-Key` header and assert:
- both responses are identical,
- only one `COMPLETE_JOB` audit log entry exists,
- the robot's state was only updated once.

## 11. Concurrency testing

Fire two simultaneous `POST /jobs/{id}/assign` requests against the same `AVAILABLE` robot from two different jobs. Exactly one must return `200`, the other `409 ROBOT_CONCURRENT_MODIFICATION`. See `tests/integration/jobs-concurrency.integration.test.ts` for a reference implementation.

## 12. Performance testing

Use k6 against `GET /api/v1/robots`, `GET /api/v1/robots/{id}/telemetry` and `GET /api/v1/qa-scenarios/large-payload` to exercise pagination and payload size under load. `GET /api/v1/qa-scenarios/delay?ms=` lets you simulate latency deterministically without touching production endpoints.

## 13. Contract testing

Model consumer/provider contracts around real boundaries, e.g. a hypothetical `Job Service` consuming `GET /robots/{id}` from a `Robot Service`, expecting `{ id, status, batteryLevel }`. See the README's "Contract Testing Roadmap".

## Suggested test cases (TC-001 … TC-015)

| ID | Title |
|---|---|
| TC-001 | Login with valid credentials |
| TC-002 | Login with invalid password |
| TC-003 | Access private endpoint without token |
| TC-004 | Access endpoint with insufficient role |
| TC-005 | Create robot with valid payload |
| TC-006 | Create robot with invalid battery |
| TC-007 | Start robot below battery threshold |
| TC-008 | Invalid robot state transition |
| TC-009 | Duplicate idempotency key |
| TC-010 | Concurrent job assignment |
| TC-011 | Pagination boundary |
| TC-012 | Invalid UUID |
| TC-013 | Telemetry immutability (no PUT/DELETE route) |
| TC-014 | Critical incident workflow (audit + notification + robot state) |
| TC-015 | Rate limiting on `/auth/login` |
