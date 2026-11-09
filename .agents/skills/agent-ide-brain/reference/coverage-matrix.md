# Coverage matrix (Appendix A and C)

| Source section | Implemented by | Notes |
| --- | --- | --- |
| Folder architecture (VSA, FSD) | rules/architecture.md.tpl, reference/folder-architecture.md, nested AGENTS.md | |
| Deterministic boundaries | lint/eslint.boundaries.config.mjs.tpl, lint/steiger.config.ts.tpl | eslint-plugin-boundaries and Steiger tested locally; public-API rule is a path-pattern heuristic |
| Instruction layering | AGENTS.root/backend/frontend templates, CLAUDE.md.tpl, GEMINI.md.tpl, check-brain size and import checks | |
| Progressive disclosure | routing table, skills on demand | |
| Context rot, Progressive Prompt Ephemerality | approximated | Harness-level pattern. Approximation: stable root file, append-only docs/agent-state/summary.md, PreCompact/SessionStart state, output-suppressing flags |
| Retrieval (code knowledge graph) | reference/optional-modules.md | Optional, off by default, unvetted tooling |
| Lifecycle hooks | claude/hooks/*.mjs, settings.json.tpl | Claude Code only; Antigravity and Codex hook enforcement not claimed |
| Circuit breakers | pre-tool-guard.mjs (tool-call cap), stop-gate.mjs | Subagent-spawn cap not implemented: no verified counter hook; not enforceable via repo files |
| Compaction resilience | pre-compact-save.mjs, session-start-restore.mjs | No native PostCompact hook assumed |
| Edit protocol | rules/verification.md.tpl | advisory |
| Verification (two tiers, 3-strike) | rules/verification.md.tpl, stop-gate.mjs, AGENTS.root | Tier 2 marker via `--mark-tier2` (Bash tool_response has no exit code) |
| Security | rules/security.md.tpl, reference/security-supply-chain.md, hidden-Unicode scan, pre-tool-guard.mjs | Sandbox and egress filtering not enforceable via repo files; guidance only |
| Appendix B rules | rules/verification.md.tpl, environment.md.tpl, antigravity-permissions.md.tpl | |
| Appendix C overclaims | rules.md, check-brain overclaim WARN | No guarantee wording generated |
| CODEX_PROJECT_MEMORY.md and token figures | deliberately not generated or cited | Unvetted third-party source |
