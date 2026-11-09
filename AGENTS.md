# thirdlevel-file

Third-level officials system: Express + PostgreSQL API in `api/`, Vite + React UI in `ui/`. Run all commands from the repo root.

## Commands
- Lint (ESLint + dependency-cruiser boundary and cycle rules): `npm run lint`
- Test: `npm run test` (Vitest; one smoke test per app)
- Build: `npm run build` (UI only)
- Tier 2, once after all changes: `npm run lint && npm run test && npm run build`
- Dev servers: `npm run dev`

## Architecture
- Backend: `api/src/features/<name>/` (auth, binary, notable-achievements, officials-registry, official-profiling). Shared kernel: `config/`, `utils/`, `middleware/`, `services/`.
- Another feature is imported only through its `index.js`; kernel folders never import features; no circular imports. Enforced by `.dependency-cruiser.cjs` (part of `npm run lint`).
- UI: pages in `ui/src/pages/`, extracted sections in `ui/src/components/<page-name>/`.

## Hard rules
1. Never print or commit secrets from `.env` files.
2. Schema changes are SQL files in `database/migrations/` (see `.agents/AGENTS.md`); rehearse locally, never touch the production DB or VM without asking.
3. Preserve existing behavior, validation, styling and business logic; make the smallest change that fixes the task.
4. Run Tier 2 once before saying work is done; after 3 failed repairs of one command, stop and report the error.
5. Never weaken lint or tests to get green.

## Routing
| Trigger | File |
| --- | --- |
| Code modification, bug-fix and migration rules | `.agents/AGENTS.md` |
| Agent architecture notes | `.agents/AGENT_ARCHITECTURE_GUIDE.md` |
| Folder conventions | `.agents/current-foldering-rules.md` |
| Verify changes (two-tier gate) | `.claude/skills/ci-gate/SKILL.md` |
| Score the folder structure | `.claude/skills/folder-architecture-audit/SKILL.md` |
| Set up or harden agent files | `.claude/skills/agent-ide-brain/SKILL.md` |

When troubleshooting or improving runtime behavior, read `.logs/LATEST.md` first (run `npm run logs:summary` to refresh it); raw entries are in `.logs/*.jsonl`.

## UI rules

All UI follows the InsightED design language: see `.agents/rules/ui.md`. To retrofit or check a UI, use the `insighted-ui-rules` skill.
