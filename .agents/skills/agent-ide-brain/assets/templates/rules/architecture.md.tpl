# Architecture rules

## Backend: vertical slices
Each use case owns one folder: `apps/backend/src/features/{{sliceExample}}/`.

| File | Role |
| --- | --- |
| route.ts | HTTP wiring only |
| handler.ts | orchestration of one use case |
| schema.ts | zod request/response schemas (shared types come from {{packageScope}}/shared) |
| repository.ts | Drizzle queries for this slice |
| *.test.ts | unit specs, co-located |
| index.ts | the slice's public API; the only file others may import |

Kernel folders, not slices: `src/db/` (connection, schema.ts, migrations) and `src/platform/` (logger, config, http setup).
Allowed cross-slice path: an explicit public export from index.ts, or a domain event. Nothing else.

## Frontend: Feature-Sliced Design
Layers, top to bottom: app, pages, widgets, features, entities, shared.

| Layer | May import from |
| --- | --- |
| app | pages, widgets, features, entities, shared |
| pages | widgets, features, entities, shared |
| widgets | features, entities, shared |
| features | entities, shared |
| entities | shared |
| shared | nothing in src |

## Enforcement
- Slices on one layer never import each other.
- Import through the slice index.ts only; deep imports are flagged by a path-pattern lint rule (heuristic).
- `eslint.boundaries.config.mjs` checks imports; `steiger.config.ts` checks FSD structure. oxlint is a fast pre-pass and does not check boundaries.
- Lint reduces the risk of structural drift. It is only as strong as these rules and the tests behind them.
