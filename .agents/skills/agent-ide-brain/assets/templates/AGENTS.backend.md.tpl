# Backend (apps/backend)

Express + Drizzle + Postgres. Package {{packageScope}}/backend.

## Layout
- Slice per use case: `src/features/{{sliceExample}}/` holding route, handler, schema, repository, tests, and index.ts.
- Platform code (db connection, logger, config) lives in `src/platform/` and `src/db/`.
- Other code imports a slice through its index.ts only.

## Conventions
- Validate every request at the edge with zod schemas from {{packageScope}}/shared.
- `src/db/schema.ts` is the source of truth for the database shape.
- Log with pino; attach a request ID to every request and log line.
- Add helmet and express-rate-limit at app setup, not per route.
- BullMQ workers are added after the local migration and before endpoints; do not wire them to any endpoint.

## Migrations
- Generate with drizzle-kit, never hand-edit generated SQL, never push to a shared DB.
- Full procedure: `docs/db-changes.md`
