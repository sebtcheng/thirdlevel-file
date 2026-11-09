# Folder architecture

## Why
Horizontal layouts scatter one feature across many folders and pull unrelated code into context. Vertical slices keep one use case together, so a task loads one folder.

## Backend: Vertical Slice Architecture
`apps/backend/src/features/<slice>/` holds route, handler, schema, repository, co-located tests, and an index.ts public API. Kernel folders `src/db/` and `src/platform/` are not slices.

## Frontend: Feature-Sliced Design
Layers: app, pages, widgets, features, entities, shared.

| Layer | May import |
| --- | --- |
| app | everything below |
| pages | widgets, features, entities, shared |
| widgets | features, entities, shared |
| features | entities, shared |
| entities | shared |
| shared | no layer |

## Rules
- Slices on one layer never import each other.
- Import a slice only through its index.ts.
- The one allowed cross-slice path is an explicit public export, or a domain event.
- Enforced by eslint.boundaries.config.mjs (dependencies, tested) and no-restricted-imports (public API, heuristic path patterns), plus steiger.config.ts for structure.

Aside: .NET uses NetArchTest and Java uses ArchUnit for the same checks. This skill targets TypeScript only.
