#!/usr/bin/env node
// Render templates and write brain files. Deterministic and idempotent. No shell calls.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, readJson, readText, writeText, defaultConfig, loadContext, decide, safeResolve, sha256, stringifyJson, exists } from './lib/brain-lib.mjs';
import { detect } from './detect-repo.mjs';

const a = parseArgs(process.argv.slice(2));
const root = path.resolve(a.root || process.cwd());
const mode = a.mode;
if (!['bootstrap', 'update', 'overwrite'].includes(mode)) { console.error('usage: apply-brain.mjs --mode bootstrap|update|overwrite [--config path] [--force]'); process.exit(2); }
const cfgPath = path.resolve(root, a.config || '.agents/brain.config.json');
const det = detect(root);
const config = readJson(cfgPath, null) || defaultConfig(root, det);
config.mode = readJson(cfgPath, null)?.mode || config.mode;

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const ctx = loadContext(root, config, det, !!a.force);
const lockPath = path.join(root, '.agents', 'brain.lock.json');
const lock = { version: 1, files: { ...(ctx.lock.files || {}) } };
let changes = 0, blocked = 0;
const log = [];

// Config must exist before rendering uses it; it is written as its own entry (create-only).
for (const entry of ctx.entries) {
  const abs = safeResolve(root, entry.path);
  // Re-vars per entry so the routing table reflects files written earlier in this run.
  const d = decide(root, entry, mode, config, ctx);
  if (d.blocked) { blocked++; log.push(`BLOCKED ${entry.path}: ${d.reason}`); continue; }
  if (d.action === 'SKIP') continue;
  if (d.action === 'OVERWRITE' && exists(abs)) {
    const bak = path.join(root, '.agents', 'backups', stamp, entry.path);
    fs.mkdirSync(path.dirname(bak), { recursive: true });
    fs.copyFileSync(abs, bak);
    log.push(`BACKUP ${entry.path} -> .agents/backups/${stamp}/${entry.path}`);
  }
  writeText(abs, d.content);
  changes++;
  log.push(`${d.action} ${entry.path}`);
  if (entry.kind !== 'scaffold' && entry.kind !== 'gitignore') lock.files[entry.path] = sha256(readText(abs));
}
// Persist the config actually used (create-only; user config is never rewritten).
if (!exists(cfgPath)) { /* created above as an entry; nothing else to do */ }

const sorted = Object.fromEntries(Object.keys(lock.files).sort().map((k) => [k, lock.files[k]]));
const lockText = stringifyJson({ version: 1, files: sorted });
if (!exists(lockPath) ? changes > 0 : readText(lockPath) !== lockText) writeText(lockPath, lockText);

for (const l of log) console.log(l);
console.log(`${changes} changes${blocked ? `, ${blocked} blocked (need --force after human approval)` : ''}`);
process.exit(blocked ? 3 : 0);
