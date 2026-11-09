# Platform matrix

Checked 2026-11-05 against official pages (fetched or surfaced by search). VERIFIED means an official page confirmed it. UNVERIFIED items must not be depended on; where one is wired anyway it is noted and fails safe.

## Claude Code
Sources: https://code.claude.com/docs/en/hooks, /memory, /settings, /permissions

| Item | Detail | Status |
| --- | --- | --- |
| Files read | CLAUDE.md (project, nested); does not read AGENTS.md by itself | VERIFIED |
| Import syntax | `@path`, relative to the importing file, max depth 4 hops, skipped in code spans | VERIFIED |
| Size limit | none enforced by the tool; this skill caps CLAUDE.md at 200 lines | advisory |
| PreToolUse exit 2 | blocks the call, stderr goes to the model | VERIFIED |
| Stop exit 2 | prevents stopping; check `stop_hook_active`; 8-consecutive-continuation cap | VERIFIED |
| PostToolUse exit 2 | stderr shown to the model, tool already ran | VERIFIED |
| Hook schema | `hooks.<Event>[{matcher, hooks:[{type:"command", command, timeout}]}]`, timeout in seconds | VERIFIED |
| Bash `tool_response` | fields stdout, stderr, interrupted; no exit code | VERIFIED. The Tier 2 marker is therefore written by ci-gate via `node .claude/hooks/post-edit-format.mjs --mark-tier2` |
| SessionStart `source` | startup, resume, clear, compact, fork | VERIFIED |
| SessionStart `additionalContext` | `hookSpecificOutput.additionalContext` JSON | UNVERIFIED (summary only). Wired; context is ignored if the shape is wrong |
| PreCompact hook | event exists; exit 2 blocks compaction | UNVERIFIED (summary only). The hook only writes state and always exits 0 |
| `CLAUDE_PROJECT_DIR` | env var set for hooks; `${CLAUDE_PROJECT_DIR}` expands in command strings | VERIFIED. Template uses plain relative `node .claude/hooks/x.mjs`; hooks read the env var when present |
| Permissions | `Read(./.env)`, `Read(./.env.*)` deny (also blocks Edit/Write on that path); exact `Bash(git status)` allow; order deny, ask, allow | VERIFIED |
| Sandbox | OS sandbox is the real control; rule matching is not a security boundary | VERIFIED |

## Codex
Source: https://developers.openai.com/codex/config-sample

| Item | Detail | Status |
| --- | --- | --- |
| Files read | AGENTS.md; discovery up to the `.git` root marker; `project_doc_max_bytes` default 32768 | VERIFIED |
| Project config | `.codex/config.toml` | VERIFIED (sample); project-level restrictions UNVERIFIED |
| Keys used | `approval_policy = "on-request"`, `sandbox_mode = "workspace-write"` | VERIFIED |
| `[sandbox_workspace_write] network_access` | table and key name | UNVERIFIED. Included in the template; confirm with `/debug-config` |
| Hooks | equivalent enforcement not claimed | UNVERIFIED |

## Gemini CLI
Sources: https://geminicli.com/docs/get-started/configuration, https://geminicli.com/docs/cli/gemini-md

| Item | Detail | Status |
| --- | --- | --- |
| Files read | GEMINI.md; `context.fileName` string or list | VERIFIED (newer docs). Older builds used top-level `contextFileName`: UNVERIFIED |
| Import syntax | `@file.md` | VERIFIED |
| Hooks | not claimed | UNVERIFIED |

## Antigravity
Source: https://www.antigravity.google/docs/rules-workflows

| Item | Detail | Status |
| --- | --- | --- |
| Rules location | `.agents/rules/` (legacy `.agent/rules/`) | VERIFIED |
| Size limit | 12,000 characters per rule file | VERIFIED. Whether it applies to AGENTS.md: UNVERIFIED |
| AGENTS.md support | read automatically | UNVERIFIED (third-party only) |
| PreToolUse hooks in the IDE | reported not firing | UNVERIFIED. No hook enforcement is assumed |
| Impeccable skill | may not run here; fall back to the Mantine theme tokens and apps/frontend/AGENTS.md | UNVERIFIED |

## Lint tooling
| Item | Status |
| --- | --- |
| eslint-plugin-boundaries 7.4.2: `boundaries/elements` settings plus `boundaries/dependencies` with `policies`, run with eslint 10.14.0 on 2026-11-05 | VERIFIED (run locally) |
| `boundaries/entry-point` | deprecated in v7; not used. Public-API-only uses core `no-restricted-imports` path patterns (run locally, heuristic) |
| steiger 0.9.0 + @feature-sliced/steiger-plugin 0.8.2: `defineConfig([...fsd.configs.recommended])` | VERIFIED (exports inspected locally) |

## Tool-name mapping
| Neutral term | Claude Code | Codex | Gemini CLI / Antigravity |
| --- | --- | --- | --- |
| read with line range | file-read tool with offset and limit | shell read command | read-file tool with line range |
| grep | search tool | rg through the shell | search tool |
| multi-edit | multi-edit or edit tool | apply_patch | edit/replace tool |
| run-command | shell tool | shell | terminal tool |
