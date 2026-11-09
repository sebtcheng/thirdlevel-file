# Security and supply chain

## Threat model
Instruction files are executable supply-chain artifacts. Threats: invisible Unicode in AGENTS.md or CLAUDE.md, poisoned files that carry instructions, credential exfiltration, malicious package installs. A model cannot reliably spot injection in its own context.

## Four defenses
1. Sandbox without credentials.
2. Egress allowlist: package registries and the git host only.
3. Pre-execution scanning: check-brain.mjs scans instruction files, rules, skills, and hooks for hidden Unicode; the pre-tool hook blocks writes that add it.
4. Consent gating: protected paths, installs, and remote hosts need human approval; the hook allowlist is the fallback.

## What repo files can and cannot enforce
- Can: permission deny entries, hook exit codes (Claude Code), lint and tests, a CI brain check.
- Cannot: sandboxing and egress filtering. Those are host settings; the optional devcontainer module gives guidance only.
- Hook deny-lists are regex and best-effort. A determined command can evade them. The sandbox is the real control.
- Hooks run with full user permissions, so review hook scripts like code. Codex and Gemini hook enforcement is not claimed.
