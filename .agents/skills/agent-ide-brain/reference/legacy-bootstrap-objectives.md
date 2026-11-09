# Legacy objectives (bootstrap-ts-monorepo)

The old skill was found at the user level only (`~/.claude/skills/bootstrap-ts-monorepo`); it was already marked deprecated and was not changed in this build (Phase 7 skipped at the user's request). Its files were read: SKILL.md, rules.md, reference/claude-settings.md, reference/agents-md-rules.md (listed), scripts/scaffold.mjs, scripts/verify-bootstrap.mjs.

| # | Objective | Now covered by |
| --- | --- | --- |
| 1 | New-repo setup: CLAUDE.md set, settings with permissions, dependencies | apply-brain.mjs (CLAUDE.md x3, .claude/settings.json), scripts/lib/deps.mjs install commands |
| 2 | Frontend/backend separation, @scope/backend\|frontend\|shared | scaffold templates, nested AGENTS.md, packageScope in config |
| 3 | Short root CLAUDE.md routing to nested files and docs | CLAUDE.md.tpl (import plus deltas), routing table in AGENTS.root.md.tpl |
| 4 | Four hard rules in root instructions | AGENTS.root.md.tpl "Hard rules" 1 to 4, docs/db-changes.md |
| 5 | AGENTS.md plus .agents/rules as single source, Antigravity version | AGENTS.md, .agents/rules/*, antigravity-permissions.md |
| 6 | Lint/CI tooling, Impeccable for UI | deps.mjs, lint templates, apps/frontend/AGENTS.md |
| 7 | Token-efficiency rules | rules/verification.md, environment.md, hooks |
| 8 | Foundation libraries (express, mantine, drizzle, pg, PgBouncer, redis, zod, vitest, playwright, pino, helmet, rate-limit, tanstack, bullmq) | reference/dependencies.md, deps.mjs |
| 9 | Skills run on demand | routing table text, CLAUDE.md delta |

## Extra items found in the old files
| Item | Status |
| --- | --- |
| Merge, never overwrite existing files | bootstrap and update modes; overwrite needs backup, approval, and --force |
| `ask` permissions for ssh, scp, psql, pg_dump, pg_restore, pm2 delete, redis-cli | settings.json.tpl `ask` list (Bash syntax; the PowerShell(...) tool prefix was not verified, so it is omitted) |
| `Read(./**/.env*)` deny variants | settings.json.tpl |
| ci-gate skill (Tier 2) | not generated: it belongs to its own skill. The routing table lists any skill found in .agents/skills |
| Five npm scripts (lint:fast, lint, typecheck, test:unit, build) | NOT added: rules.md forbids editing package.json scripts. GAP by design; add them by hand. Tier 2 is built from the scripts that exist |
| Redis write buffer, nginx, PM2 notes | deployment detail, out of scope; PM2 delete is gated by the ask list |
| verify-bootstrap structural check | check-brain.mjs |
