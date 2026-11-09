# Optional modules (opt-in only)

The skill writes none of these unless the config sets the module to true.

## Code Knowledge Graph (default off)
A Tree-sitter AST graph exposed over MCP gives repo maps and blast-radius queries. The tools named in the source report are unvetted third-party packages: require version pinning, source review, no install scripts, and a human decision before adding. dependency-cruiser is a lighter, deterministic import-graph alternative.

## Devcontainer sandbox (default off)
Run agents in a container with no credentials mounted and egress filtered to registries and the git host. Filtering is configured on the host or network, not by repo files.

## Pre-commit scan (default off)
A git hook that runs check-brain.mjs and blocks commits when instruction files contain hidden Unicode or secret patterns.
