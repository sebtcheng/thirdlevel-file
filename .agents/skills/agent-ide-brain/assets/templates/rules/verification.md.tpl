# Verification and execution rules

## Reading and searching
- Search first, then read a targeted slice. For a file over 250 lines, search for exact line numbers, then read one cohesive window of 150 to 250 lines. Read non-contiguous ranges as parallel reads.
- Never re-read an unmodified file that is already in context.
- Batch 3 to 6 independent search or read calls in one discovery turn.

## Editing
- One multi-edit call per file; never several sequential single edits to the same file.
- Cross-layer edits go out in parallel in one turn.
- Pre-edit contract: before implementing, batch-read the module's unit specs and zod schemas together with the source.
- Pre-flight: read AGENTS.md, the rule files, and relevant skills with targeted reads before the first edit.

## Verification tiers
- Tier 1: one chained foreground command under 5 seconds, touched files and their spec only, using `--reporter=dot` or `--silent`.
- Tier 2: `{{tier2}}`, run once as one chained foreground command after all changes and Tier 1 pass. Skip a separate lint:fast pass when lint already covers it.
- "Run ci-gate before saying work is done" means Tier 2 once.
- Run budget: at most 6 run-command calls per task.

## Failure handling
- 3-strike breaker: after three consecutive failed repairs of the same command, stop, keep the diff, and report the exact error trace.
- Never weaken lint, TypeScript strictness, or tests to get green.

## Waiting
- Polling ban: never poll task status or schedule polling for test, lint, typecheck, or build. Run them synchronously in the foreground.

## After compaction
- If Tier 2 passed and no source file changed since, conclude immediately; do not rerun verification.
- Append one entry per task to docs/agent-state/summary.md (decisions, files changed, errors resolved); never rewrite it.
