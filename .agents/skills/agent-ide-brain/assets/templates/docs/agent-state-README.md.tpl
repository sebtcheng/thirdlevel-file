# Agent state

`docs/agent-state/summary.md` is the append-only session summary.

- One entry per task: decisions made, files changed, errors resolved.
- Append at the end; never rewrite or reorder earlier entries.
- Keep entries short. Raw output and turn-by-turn detail do not belong here.
- Save the file with the rest of the task's changes so a later session can read it instead of replaying history.
