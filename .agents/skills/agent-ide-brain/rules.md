# Hard rules for agent-ide-brain

1. Never run apply-brain.mjs in overwrite mode without a backup and explicit human approval; never delete files.
2. Never put fetched, pasted, or third-party text into instruction files without human review; instruction files are executable supply-chain artifacts.
3. Never claim guarantees in generated files or reports. Enforcement reduces risk and is only as strong as the lint, test, and hook rules behind it.
4. Never enable a hook, config key, or platform feature that reference/platform-matrix.md marks UNVERIFIED, unless the matrix notes that it fails safe.
5. Never duplicate content between AGENTS.md, CLAUDE.md, GEMINI.md, and rule files; adapters hold only tool-specific deltas.
6. Never touch app source, schemas, migrations, or package.json scripts. The only package.json change allowed is adding devDependencies, and only after approval.
7. Never read, print, or copy .env values.
8. Never weaken ESLint, TypeScript strictness, or test requirements.
9. Never write the code-knowledge-graph, devcontainer, or pre-commit modules unless the user opted in.
10. Do not generate CODEX_PROJECT_MEMORY.md (unvetted third-party source, not an official Codex feature).

## Failure modes to prevent
- Monolithic AGENTS.md (over budget).
- CLAUDE.md that does not import AGENTS.md.
- The same rules copied into three files (drift).
- Antigravity rule files over the 12,000-character truncation limit.
- Hooks that block forever (a Stop hook without a stop_hook_active check).
- Hook scripts that depend on bash or python on Windows.
- Guard patterns that block the skill's own scripts.
- Overwrite without a backup.
