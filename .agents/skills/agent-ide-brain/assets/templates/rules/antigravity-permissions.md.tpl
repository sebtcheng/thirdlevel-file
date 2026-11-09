# Antigravity terminal and permission policy

- Run verification in the foreground and wait for the result; never schedule or poll background checks.
- Command allowlist: {{lintCmd}}, {{testCmd}}, {{buildCmd}}, {{typecheckCmd}}, and read-only git (status, diff, log).
- Everything else, including installs, network downloads, ssh, and database clients against non-local hosts, needs explicit approval first.
- Do not rely on lifecycle hooks on this platform; pre-tool hook firing is not verified here. Keep terminal approval on for anything outside the allowlist.
- Keep each rule file under 12,000 characters; this repo keeps them under 10,000.
