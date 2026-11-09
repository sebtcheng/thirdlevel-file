name: brain-check
on:
  pull_request:
    paths:
      - 'AGENTS.md'
      - '**/AGENTS.md'
      - '**/CLAUDE.md'
      - 'GEMINI.md'
      - '.agents/**'
      - '.claude/**'
      - '.codex/**'
      - '.gemini/**'
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: node .agents/skills/agent-ide-brain/scripts/check-brain.mjs
