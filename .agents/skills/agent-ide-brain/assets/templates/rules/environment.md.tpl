# Environment profile

Detected when the brain was generated (re-run detection after changing machines):

| Item | Value |
| --- | --- |
| OS | {{env.os}} |
| Shell | {{env.shell}} |
| Node | {{env.node}} |
| Package manager | {{env.packageManager}} |
| Runner | {{env.npx}} |

## Rules
- Always run commands from the workspace root.
- Use the prefix above (on Windows: npm.cmd and npx.cmd).
- No exploratory discovery commands (no recursive directory listings, no OS probing); use targeted search instead.
- No unprompted install or ci.
- Write file paths with forward slashes in config files.
