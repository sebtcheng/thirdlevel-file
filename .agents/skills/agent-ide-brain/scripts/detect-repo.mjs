#!/usr/bin/env node
// Deterministic repo inspection. JSON to stdout only. Never reads .env contents.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, readJson, sha256, readText, git, toPosix } from './lib/brain-lib.mjs';

const BRAIN_FILES = [
  'AGENTS.md', 'CLAUDE.md', 'GEMINI.md', 'apps/backend/AGENTS.md', 'apps/backend/CLAUDE.md',
  'apps/frontend/AGENTS.md', 'apps/frontend/CLAUDE.md', '.agents/brain.config.json', '.agents/brain.lock.json',
  '.agents/rules/architecture.md', '.agents/rules/verification.md', '.agents/rules/security.md',
  '.agents/rules/environment.md', '.agents/rules/antigravity-permissions.md',
  '.claude/settings.json', '.codex/config.toml', '.gemini/settings.json',
  'eslint.boundaries.config.mjs', 'steiger.config.ts', 'docs/db-changes.md', 'docs/agent-state/README.md',
  '.github/workflows/brain-check.yml',
];

function info(root, rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) return null;
  const t = readText(p);
  return { hash: sha256(t), chars: t.length, lines: t.split('\n').length };
}

function listSkills(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(dir, d.name, 'SKILL.md')))
    .map((d) => d.name).sort();
}

export function detect(root) {
  root = path.resolve(root);
  const win = process.platform === 'win32';
  const pkg = readJson(path.join(root, 'package.json'), null);
  const has = (f) => fs.existsSync(path.join(root, f));
  let pm = 'npm';
  if (has('pnpm-lock.yaml')) pm = 'pnpm'; else if (has('yarn.lock')) pm = 'yarn';
  const prefix = win && pm === 'npm' ? 'npm.cmd' : pm;
  const deps = { ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) };
  const userSkills = path.join(os.homedir(), '.claude', 'skills');
  const legacy = [];
  for (const [label, dir] of [['.claude/skills', path.join(root, '.claude', 'skills')], ['.agents/skills', path.join(root, '.agents', 'skills')], ['user-level', userSkills]]) {
    if (fs.existsSync(path.join(dir, 'bootstrap-ts-monorepo'))) legacy.push(label);
  }
  const files = {};
  for (const f of BRAIN_FILES) { const i = info(root, f); if (i) files[f] = i; }
  const hooksDir = path.join(root, '.claude', 'hooks');
  const hooks = fs.existsSync(hooksDir) ? fs.readdirSync(hooksDir).sort() : [];
  const status = git(root, ['status', '--porcelain']);
  return {
    root: toPosix(root),
    os: process.platform,
    shell: win ? 'powershell' : path.basename(process.env.SHELL || 'sh'),
    node: process.versions.node,
    packageName: pkg?.name || null,
    packageManager: { name: pm, prefix },
    workspaces: pkg?.workspaces || null,
    scripts: pkg?.scripts || {},
    tooling: {
      oxlint: 'oxlint' in deps, eslint: 'eslint' in deps, prettier: 'prettier' in deps,
      steiger: 'steiger' in deps || '@feature-sliced/steiger-plugin' in deps,
      boundaries: 'eslint-plugin-boundaries' in deps,
    },
    skeleton: { backend: has('apps/backend'), frontend: has('apps/frontend'), shared: has('packages/shared') },
    brainFiles: files,
    hooks,
    skills: { agents: listSkills(path.join(root, '.agents', 'skills')), claude: listSkills(path.join(root, '.claude', 'skills')) },
    envFilesPresent: fs.readdirSync(root).filter((n) => /^\.env/.test(n)).length > 0,
    git: { isRepo: status !== null, branch: git(root, ['rev-parse', '--abbrev-ref', 'HEAD'])?.trim() || null, dirty: status ? status.trim().length > 0 : false },
    legacyBootstrapSkill: legacy,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = parseArgs(process.argv.slice(2));
  process.stdout.write(JSON.stringify(detect(a.root || process.cwd()), null, 2) + '\n');
}
