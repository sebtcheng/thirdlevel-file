// Shared helpers for agent-brain hooks. Node only (no bash/python). Managed by agent-ide-brain; do not hand-edit.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

export function readPayload() {
  let raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch { /* no stdin */ }
  try { return raw.trim() ? JSON.parse(raw) : {}; } catch { return {}; }
}

export function projectRoot(payload) {
  return path.resolve(process.env.CLAUDE_PROJECT_DIR || payload?.cwd || process.cwd());
}

const DEFAULTS = {
  maxToolCalls: 300,
  maxStopBlocks: 3,
  localDbHosts: ['localhost', '127.0.0.1', '::1'],
  protectedHosts: [],
  allowInstall: false,
  commands: { tier2: '' },
  protectedPaths: [],
};

export function loadConfig(root) {
  try {
    const c = JSON.parse(fs.readFileSync(path.join(root, '.agents', 'brain.config.json'), 'utf8'));
    return { ...DEFAULTS, ...c, commands: { ...DEFAULTS.commands, ...(c.commands || {}) } };
  } catch { return { ...DEFAULTS }; }
}

export const stateDir = (root) => path.join(root, '.claude', 'state');
export function readState(root, name, fallback = null) {
  try { return JSON.parse(fs.readFileSync(path.join(stateDir(root), name), 'utf8')); } catch { return fallback; }
}
export function writeState(root, name, data) {
  fs.mkdirSync(stateDir(root), { recursive: true });
  fs.writeFileSync(path.join(stateDir(root), name), JSON.stringify(data, null, 2) + '\n');
}

export function git(root, args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 4000 });
  } catch { return null; }
}

const NON_SOURCE = /^(\.agents|\.claude|\.codex|\.gemini|docs|\.github)\/|\.(md|txt)$|(^|\/)(AGENTS|CLAUDE|GEMINI)\.md$/;
export function changedFiles(root) {
  const out = git(root, ['status', '--porcelain', '--untracked-files=all']);
  if (out === null) return [];
  return out.split('\n').filter(Boolean).map((l) => l.slice(3).replace(/^"|"$/g, '').split(' -> ').pop());
}
export const isSource = (f) => !NON_SOURCE.test(f.replace(/\\/g, '/')) && !/^package-lock\.json$/.test(f);

export function sourceDiffHash(root) {
  const files = changedFiles(root).filter(isSource).sort();
  const h = crypto.createHash('sha256');
  for (const f of files) {
    let c = '';
    try { c = fs.readFileSync(path.join(root, f)); } catch { /* deleted */ }
    h.update(f + '\0' + crypto.createHash('sha256').update(c).digest('hex') + '\n');
  }
  return { hash: h.digest('hex'), files };
}

// Block: exit 2 with the rule id and the allowed alternative on stderr.
export function block(rule, reason, alternative) {
  process.stderr.write(`BLOCKED [${rule}] ${reason}. Allowed instead: ${alternative}\n`);
  process.exit(2);
}

export const HIDDEN_RE = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]|\uDB40[\uDC00-\uDC7F]/;
export const HARD_RULES = ['R1-no-secrets', 'R2-schema-contract', 'R3-tier2-before-done', 'R4-no-production-without-asking'];

// 5s timeout budget for every hook.
export function budget(ms = 5000) {
  const t = setTimeout(() => process.exit(0), ms);
  t.unref?.();
}
