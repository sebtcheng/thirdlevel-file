# Best practices

Contents: folder architecture, deterministic boundaries, instruction layering, context rot management, retrieval, lifecycle hooks, edit protocol, verification, security.

## Folder architecture
Attention cost grows with context, and plausible but irrelevant code hurts retrieval. Use vertical slices (backend) and Feature-Sliced Design (frontend) so one task touches one folder.

## Deterministic boundaries
Prose is advisory; lint output is read by the agent and acted on. Use eslint-plugin-boundaries plus Steiger. They reduce structural drift; they do not remove it.

## Instruction layering
Root AGENTS.md is lean: constraints, exact commands, a routing table. Nested AGENTS.md per app (nearest wins). CLAUDE.md imports AGENTS.md and adds only Claude deltas; GEMINI.md is a pointer. Antigravity truncates rule files near 12,000 characters, so rules stay under 10,000. Procedures live in skills that load on demand.

## Context rot management
Quality drops as irrelevant text accumulates. Keep a stable prefix, an append-only docs/agent-state/summary.md, and output-suppressing flags. Progressive Prompt Ephemerality is a harness feature; repo files only approximate it.

## Retrieval
Search for structure before reading. A code knowledge graph is optional and off by default.

## Lifecycle hooks
SessionStart injects state, PreToolUse can block, PostToolUse formats and lints the edited file, PreCompact saves state, Stop gates completion (check `stop_hook_active`). A rule in text is a suggestion; a hook exit code is enforcement, on Claude Code only.

## Edit protocol
Search first, read a 150 to 250 line slice, batch independent reads, one multi-edit per file, read specs and schemas before editing.

## Verification
Tier 1 inner loop (fast, touched files). Tier 2 once at the end. After three failed repairs of one command, stop and report.

## Security
See security-supply-chain.md. Defense in depth; the sandbox is the real control.
