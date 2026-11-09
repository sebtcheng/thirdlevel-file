#!/usr/bin/env node
// Pipes JSON fixtures into each hook and asserts exit codes. Runs in a throwaway project dir under the OS temp dir.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { parseArgs } from './lib/brain-lib.mjs';

const a = parseArgs(process.argv.slice(2));
const repo = path.resolve(a.root || process.cwd());
const hooks = path.join(repo, '.claude', 'hooks');
if (!fs.existsSync(path.join(hooks, 'pre-tool-guard.mjs'))) { console.error('ERROR hooks not installed in ' + hooks); process.exit(1); }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-hooks-'));
const sh = (args) => execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { cwd: tmp, stdio: 'ignore' });
sh(['init', '-q']);
fs.mkdirSync(path.join(tmp, 'src'));
fs.mkdirSync(path.join(tmp, '.agents'));
fs.writeFileSync(path.join(tmp, 'src', 'a.ts'), 'export const a = 1;\n');
fs.writeFileSync(path.join(tmp, '.agents', 'brain.config.json'), JSON.stringify({
  maxToolCalls: 300, maxStopBlocks: 3, localDbHosts: ['localhost', '127.0.0.1'], allowInstall: false,
  commands: { tier2: 'npm run lint && npm run build' },
  protectedPaths: ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md', '.agents/', '.claude/', '.codex/', '.gemini/', 'eslint.boundaries.config.mjs', 'steiger.config.ts', '.github/workflows/', '.env'],
}));
sh(['add', '-A']); sh(['commit', '-q', '-m', 'init']);

const stateDir = path.join(tmp, '.claude', 'state');
const setCalls = (o) => { fs.mkdirSync(stateDir, { recursive: true }); fs.writeFileSync(path.join(stateDir, 'calls.json'), JSON.stringify(o)); };
const clearState = () => fs.rmSync(stateDir, { recursive: true, force: true });

function run(hook, payload, env = {}) {
  const r = spawnSync(process.execPath, [path.join(hooks, hook)], {
    input: JSON.stringify({ session_id: 's1', cwd: tmp, ...payload }), encoding: 'utf8', timeout: 8000,
    env: { ...process.env, CLAUDE_PROJECT_DIR: tmp, AGENT_BRAIN_ALLOW_PROTECTED: '', ...env },
  });
  return { code: r.status, err: r.stderr || '', out: r.stdout || '' };
}
const bash = (command) => ({ tool_name: 'Bash', tool_input: { command } });
const edit = (file_path, new_string = 'x') => ({ tool_name: 'Edit', tool_input: { file_path, old_string: 'a', new_string } });

const cases = [
  ['rm -rf /', () => run('pre-tool-guard.mjs', bash('rm -rf /')), 2, /D1/],
  ['git reset --hard', () => run('pre-tool-guard.mjs', bash('git reset --hard HEAD~1')), 2, /G2/],
  ['Get-Content .env', () => run('pre-tool-guard.mjs', bash('Get-Content .env')), 2, /R1/],
  ['cat .env', () => run('pre-tool-guard.mjs', bash('cat .env')), 2, /R1/],
  ['ssh remote', () => run('pre-tool-guard.mjs', bash('ssh deploy@prod.example.org uptime')), 2, /R4/],
  ['psql -h remote', () => run('pre-tool-guard.mjs', bash('psql -h db.example.org -U app')), 2, /R4/],
  ['psql local ok', () => run('pre-tool-guard.mjs', bash('psql -h localhost -U app')), 0],
  ['edit AGENTS.md blocked', () => run('pre-tool-guard.mjs', edit('AGENTS.md')), 2, /PP1/],
  ['edit AGENTS.md approved', () => run('pre-tool-guard.mjs', edit('AGENTS.md'), { AGENT_BRAIN_ALLOW_PROTECTED: '1' }), 0],
  ['hidden unicode write', () => run('pre-tool-guard.mjs', edit('src/a.ts', 'x\u200By')), 2, /U1/],
  ['npm install x', () => run('pre-tool-guard.mjs', bash('npm install x')), 2, /I1/],
  ['benign vitest', () => run('pre-tool-guard.mjs', bash('npx vitest run foo.spec.ts --reporter=dot')), 0],
  ['skill own script', () => run('pre-tool-guard.mjs', bash('node .agents/skills/agent-ide-brain/scripts/apply-brain.mjs --mode update')), 0],
  ['301st call (cap 300)', () => { setCalls({ session: 's1', count: 300, tripped: false }); return run('pre-tool-guard.mjs', bash('echo hi')); }, 2, /synthesize findings and stop/],
  ['stop_hook_active', () => run('stop-gate.mjs', { stop_hook_active: true }), 0],
  ['stop, source changed, no marker', () => { clearState(); fs.writeFileSync(path.join(tmp, 'src', 'a.ts'), 'export const a = 2;\n'); return run('stop-gate.mjs', {}); }, 2, /R3/],
  ['stop, breaker tripped', () => { setCalls({ session: 's1', count: 300, tripped: true }); return run('stop-gate.mjs', {}); }, 0],
  ['stop, after mark-tier2', () => { clearState(); run('post-edit-format.mjs', {}, {}); spawnSync(process.execPath, [path.join(hooks, 'post-edit-format.mjs'), '--mark-tier2'], { env: { ...process.env, CLAUDE_PROJECT_DIR: tmp }, input: '{}' }); return run('stop-gate.mjs', {}); }, 0],
];

let fail = 0;
for (const [name, fn, want, re] of cases) {
  const r = fn();
  const ok = r.code === want && (!re || re.test(r.err));
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} (exit ${r.code}, want ${want})${ok ? '' : ' ' + r.err.trim().slice(0, 160)}`);
}
// compact/restore round trip
clearState();
const pc = run('pre-compact-save.mjs', {});
const rs = run('session-start-restore.mjs', { source: 'compact' });
let ctxOk = false;
try { const j = JSON.parse(rs.out); ctxOk = j.hookSpecificOutput.additionalContext.length <= 1500; } catch { /* fail */ }
const rtOk = pc.code === 0 && rs.code === 0 && ctxOk;
if (!rtOk) fail++;
console.log(`${rtOk ? 'PASS' : 'FAIL'} pre-compact save + session-start restore`);

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`test-hooks: ${cases.length + 1 - fail}/${cases.length + 1} passed`);
process.exit(fail ? 1 : 0);
