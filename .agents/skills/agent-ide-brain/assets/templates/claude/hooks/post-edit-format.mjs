// PostToolUse. Formats and lints the one edited file; writes the Tier 2 marker. Cannot block the tool (already ran).
// Marker policy: if the Bash payload exposes an explicit exit code 0 for the configured Tier 2 command, this hook writes the marker.
// Otherwise ci-gate must run `node .claude/hooks/post-edit-format.mjs --mark-tier2` after a green Tier 2.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { readPayload, projectRoot, loadConfig, writeState, sourceDiffHash, budget } from './lib.mjs';

budget();
const payload = readPayload();
const root = projectRoot(payload);
const cfg = loadConfig(root);

function markTier2() {
  const { hash, files } = sourceDiffHash(root);
  writeState(root, 'tier2-pass.json', { diffHash: hash, files: files.length, at: new Date().toISOString() });
}

if (process.argv.includes('--mark-tier2')) { markTier2(); process.exit(0); }

const tool = payload.tool_name || '';
const input = payload.tool_input || {};

if (tool === 'Bash') {
  const t2 = (cfg.commands?.tier2 || '').trim();
  const resp = payload.tool_response || {};
  const code = resp.exit_code ?? resp.exitCode ?? resp.returnCode;
  if (t2 && String(input.command || '').trim() === t2 && code === 0) markTier2();
  process.exit(0);
}

const file = input.file_path ? path.resolve(root, input.file_path) : null;
if (!file || !fs.existsSync(file) || !/\.(ts|tsx|js|jsx|mjs|cjs|json|css)$/.test(file)) process.exit(0);

const bin = (pkg, rel) => { const p = path.join(root, 'node_modules', pkg, rel); return fs.existsSync(p) ? p : null; };
const run = (script, args) => {
  try { execFileSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 4000 }); return null; }
  catch (e) { return `${e.stdout || ''}${e.stderr || ''}`.trim() || String(e.message); }
};

const prettier = bin('prettier', 'bin/prettier.cjs');
if (prettier) run(prettier, ['--write', file]);

if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file)) {
  const ox = bin('oxlint', 'bin/oxlint');
  const es = bin('eslint', 'bin/eslint.js');
  const errs = [];
  if (ox) { const r = run(ox, [file]); if (r) errs.push(r); }
  if (es) { const r = run(es, [file]); if (r) errs.push(r); }
  if (errs.length) {
    process.stderr.write(`LINT errors in ${path.relative(root, file)}; fix them in one consolidated edit:\n${errs.join('\n').slice(0, 3000)}\n`);
    process.exit(2);
  }
}
process.exit(0);
