@AGENTS.md

# Claude Code deltas
- Prefer the simplest implementation that works.
- Do not refactor or add generic abstractions unless asked.
- Skills load on demand; read one only when its routing row matches the task.
- Hooks in .claude/settings.json are authoritative over instruction text; a blocked call names the rule and the allowed alternative.
