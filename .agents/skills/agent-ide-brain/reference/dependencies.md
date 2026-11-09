# Dependencies

Versions verified with `npm view` on 2026-11-05 and pinned exactly. The source of truth is scripts/lib/deps.mjs; plan-brain.mjs prints the commands. Install only with human approval, once, in the foreground.

| Group | Packages |
| --- | --- |
| lint/CI (root dev) | eslint 10.14.0, typescript-eslint 8.72.1, eslint-plugin-boundaries 7.4.2, oxlint 1.91.0, prettier 3.9.10, steiger 0.9.0, @feature-sliced/steiger-plugin 0.8.2, typescript 7.0.2, vitest 5.1.0, @playwright/test 1.64.1 |
| backend | express 5.3.0, drizzle-orm 0.45.4, pg 8.23.1, ioredis 6.0.0, zod 4.6.7, pino 10.4.0, pino-http 11.0.0, helmet 8.3.0, express-rate-limit 8.7.3; dev: drizzle-kit 0.31.11 |
| frontend | @mantine/core 9.7.5, react 19.3.1, @tanstack/react-query 5.106.1 |
| shared | zod 4.6.7 |
| later | bullmq 6.7.0 in apps/backend, added after the local migration and before endpoints; not wired to any endpoint |

PgBouncer is infrastructure, not an npm package. There is no `@feature-sliced/steiger` package on npm; the CLI is `steiger`. These latest versions were not tested together (for example typescript 7 with typescript-eslint).
