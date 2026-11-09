# Database changes

Applies to every schema change. Source of truth: `apps/backend/src/db/schema.ts`.

1. Edit schema.ts, then generate the migration with `drizzle-kit generate`. Do not hand-write or hand-edit the generated SQL.
2. Rehearse it on a local or scratch database loaded with realistic data (volume and edge cases), not an empty one.
3. Write a rollback plan: the exact reverse steps, and what data would be lost.
4. Show the generated SQL and the rollback plan to the human before the change reaches any shared database.
5. Never use `drizzle-kit push` against a shared database. Never run migrations against production without asking; production is out of bounds for agents.

Local DB hosts for rehearsal: {{localDbHostsText}}.
