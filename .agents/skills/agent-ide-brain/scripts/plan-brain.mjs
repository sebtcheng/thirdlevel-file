#!/usr/bin/env node
// Dry run. Writes nothing. Prints CREATE / EDIT / OVERWRITE / SKIP per file plus the install command.
import path from 'node:path';
import { parseArgs, readJson, defaultConfig, loadContext, decide, safeResolve, exists } from './lib/brain-lib.mjs';
import { detect } from './detect-repo.mjs';
import { installCommands } from './lib/deps.mjs';

const a = parseArgs(process.argv.slice(2));
const root = path.resolve(a.root || process.cwd());
const mode = a.mode || 'bootstrap';
if (!['bootstrap', 'update', 'overwrite'].includes(mode)) { console.error('--mode must be bootstrap|update|overwrite'); process.exit(2); }
const cfgPath = path.resolve(root, a.config || '.agents/brain.config.json');
const det = detect(root);
const config = readJson(cfgPath, null) || defaultConfig(root, det);
const ctx = loadContext(root, config, det, !!a.force);
let bad = false;
const rows = [];
for (const entry of ctx.entries) {
  try { safeResolve(root, entry.path); } catch (e) { console.error(`ERROR ${e.message}`); bad = true; continue; }
  const d = decide(root, entry, mode, config, ctx);
  const cur = exists(path.join(root, entry.path)) ? 1 : 0;
  const size = d.content ? d.content.length : 0;
  rows.push([d.action, entry.path, d.reason, d.content ? `${size} chars` : '-']);
}
if (bad) process.exit(1);
const w = Math.max(...rows.map((r) => r[1].length));
console.log(`mode=${mode} root=${root}`);
for (const [act, p, why, sz] of rows) console.log(`${act.padEnd(9)} ${p.padEnd(w)}  ${sz.padEnd(12)} ${why}`);
const counts = rows.reduce((m, r) => ((m[r[0]] = (m[r[0]] || 0) + 1), m), {});
console.log(`summary ${JSON.stringify(counts)}`);
if (rows.some((r) => r[0] === 'SKIP' && /--force|use overwrite/.test(r[2]))) console.log('note: some files need --force (human approval) to be replaced');
console.log('install (needs human approval, run once in foreground):');
for (const c of installCommands(config, det)) console.log(`  ${c}`);
