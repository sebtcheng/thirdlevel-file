---
name: agent-ide-brain
description: "Create, update, or overwrite the AI agent IDE brain for a TypeScript/Node monorepo so Claude Code, OpenAI Codex, and Gemini CLI/Google Antigravity follow one rule set: lean AGENTS.md as single source, CLAUDE.md/GEMINI.md/.agents/rules adapters, vertical-slice backend and Feature-Sliced frontend boundaries enforced by lint, lifecycle hooks and permission guards, token-efficiency and two-tier verification rules, and hidden-Unicode scanning of instruction files. Replaces the deprecated bootstrap-ts-monorepo skill (also scaffolds apps/backend, apps/frontend, packages/shared with settings and dependencies). Use when the user says 'set up the agent brain', 'bootstrap a new TS monorepo', 'make Codex and Gemini follow the same rules as Claude', 'fix drift between AGENTS.md and CLAUDE.md', 'add hooks and guardrails for AI agents', or 'harden my agent instructions'. Not for scoring folder architecture, running CI, or splitting large files."
---

# agent-ide-brain

Builds and maintains the agent "brain" of a TypeScript/Node monorepo: one lean AGENTS.md as the single source, thin adapters for each tool, boundary lint, lifecycle hooks, permission guards, and verification rules, plus the monorepo skeleton when it is missing. It replaces and deprecates `bootstrap-ts-monorepo` and keeps all of that skill's objectives (see reference/legacy-bootstrap-objectives.md). All scripts are Node `.mjs`, Windows-safe, with no network access. Hard constraints are in rules.md; read it first. Paths below are relative to this skill folder; scripts take `--root <repo>` (default: current directory).

## Reading list
- Before generating any platform-specific file: reference/platform-matrix.md.
- When folders are being set up or checked: reference/folder-architecture.md.
- When touching hooks, settings, or any instruction file: reference/security-supply-chain.md.

## Workflow
1. **Detect.** Run `node scripts/detect-repo.mjs`. It prints JSON: OS, shell, Node, package manager, workspaces, existing brain files, skills, lint/test commands, git state. Do not hand-explore the repo.
2. **Decide.** Fill what the JSON answers. Ask at most 3 questions, only for gaps: (a) tools to target (default claude, codex, gemini/antigravity); (b) mode: `bootstrap` (nothing exists; creates missing files, skips existing), `update` (replaces only managed blocks and merges JSON, keeps user text), `overwrite` (replaces whole files after backup); (c) optional modules: CI workflow, pre-commit, devcontainer sandbox, code knowledge graph (all off except the CI workflow). Write the answers to `.agents/brain.config.json`; it is never overwritten by the scripts afterwards.
3. **Plan.** Run `node scripts/plan-brain.mjs --mode <mode>`. It is a dry run printing CREATE, EDIT, OVERWRITE, or SKIP for every file plus the dependency install commands. Show it. Get human approval before any EDIT or OVERWRITE of a file this skill did not create, and before any install.
4. **Apply.** Run `node scripts/apply-brain.mjs --mode <mode>` exactly (add `--force` only with approval, for overwriting files that differ from the lock file). Never write brain files by hand.
5. **Mirror skills.** Run `node scripts/sync-skills.mjs`.
6. **Dependencies.** The commands printed in step 3 come from reference/dependencies.md. Run them only with approval, in the foreground, once.
7. **Verify.** Run `node scripts/check-brain.mjs`, then `node scripts/test-hooks.mjs`, then the repo's own Tier 2 command once if it exists. After a green Tier 2, run `node .claude/hooks/post-edit-format.mjs --mark-tier2` so the Stop gate sees the pass.
8. **Report.** Files created, edited, overwritten; backup location (`.agents/backups/<timestamp>/`); check results; anything unverified; and which platform features were not enabled because the matrix marks them UNVERIFIED.

## Acceptance criteria
- check-brain.mjs exits 0 and test-hooks.mjs passes every fixture.
- A second apply-brain.mjs run reports 0 changes.
- No `{{token}}` or placeholder text remains.
- Root AGENTS.md is within 8,000 characters and 120 lines.
- Every CLAUDE.md imports its sibling AGENTS.md.
- No instruction file contains hidden Unicode.
- The skill mirror has no drift.
- No overwritten file lacks a backup.

## Verification step
Before returning the final output, define the acceptance criteria. Create the first version, inspect it using scripts/check-brain.mjs, scripts/test-hooks.mjs and a second idempotent apply run, fix every issue, run another pass. Return only after it meets the criteria, with a short summary of what you checked. Report anything that cannot be verified.

## Notes
- Hooks (Claude Code) are enforcement; instruction text and the other tools' config are advisory. Codex and Gemini rely on sandbox and approval settings, AGENTS.md, and the CI brain check.
- Scoring folder architecture, running CI, splitting files, and security scanning belong to other skills.
