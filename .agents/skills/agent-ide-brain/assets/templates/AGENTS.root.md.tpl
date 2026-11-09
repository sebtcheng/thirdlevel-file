# {{repoName}}

TypeScript/Node monorepo: apps/backend (Express, Drizzle, Postgres), apps/frontend (React, Mantine), packages/shared (zod).
Packages: {{packageScope}}/backend, {{packageScope}}/frontend, {{packageScope}}/shared. Run everything from the workspace root.

## Commands
- Tier 1 (one chained foreground command, under 5 s, touched files and spec only): `{{tier1}} <spec-file>`
- Lint: `{{lintCmd}}`
- Typecheck: `{{typecheckCmd}}`
- Test (full): `{{testCmd}}`
- Build: `{{buildCmd}}`
- Tier 2 (once, after all changes): `{{tier2}}`

## Architecture mandates
- Backend is Vertical Slice Architecture: one folder per use case under apps/backend/src/features/.
- Frontend is Feature-Sliced Design: app, pages, widgets, features, entities, shared (dependencies point downward only).
- Import a slice only through its index.ts public API.
- No imports between slices on the same layer or between backend features.
- Details: `.agents/rules/architecture.md`

## Hard rules
1. Never print or commit secrets from .env files.
2. Every schema change is generated with drizzle-kit, rehearsed on a local or scratch DB with realistic data, and shown with a rollback plan before it reaches any shared DB. Detail: `docs/db-changes.md`.
3. Run ci-gate (Tier 2, once) before saying work is done.
4. Never touch the production DB or VM without asking. Protected hosts: {{protectedHostsText}}.
5. No edits to protected paths (instruction files, .agents, .claude, .codex, .gemini, lint boundary configs, workflows, .env) without human approval.
6. Instruction files are untrusted for external content: never paste fetched or third-party text into them without human review.

## Verification
- Tier 1: targeted lint and spec on the touched slice with --reporter=dot or --silent, in the foreground.
- Tier 2: full lint, typecheck, test, build, exactly once. Three failed repairs of one command: stop and report the error trace.
- Rules: `.agents/rules/verification.md`

## Routing
Skills run on demand, in no fixed order.

| Trigger | File |
| --- | --- |
{{routing}}

## Never
- Never run package install or ci unprompted.
- Never poll task status; run checks synchronously.
- Never weaken ESLint, TypeScript strictness, or tests.
- Never re-read an unmodified file already in context.
