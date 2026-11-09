#!/usr/bin/env node
// Deterministic verifier. One line per finding. Exit 1 if any ERROR.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, readText, readJson, walk, sha256, toPosix, LIMITS, hasHiddenUnicode, SECRET_RES, OVERCLAIM_RE } from './lib/brain-lib.mjs';
import { syncSkills } from './sync-skills.mjs';

const a = parseArgs(process.argv.slice(2));
const root = path.resolve(a.root || process.cwd());
const out = [];
const add = (lvl, msg) => out.push(`${lvl} ${msg}`);
const P = (r) => path.join(root, r);
const ex = (r) => fs.existsSync(P(r));
const rel = (f) => toPosix(path.relative(root, f));

const cfg = readJson(P('.agents/brain.config.json'), null);
if (!cfg) { add('ERROR', '.agents/brain.config.json missing or invalid'); }
const tools = cfg?.tools || ['claude', 'codex', 'gemini'];
const lock = readJson(P('.agents/brain.lock.json'), { files: {} });

// 1. required files
const req = ['AGENTS.md', 'apps/backend/AGENTS.md', 'apps/frontend/AGENTS.md', '.agents/brain.config.json', '.agents/brain.lock.json',
  '.agents/rules/architecture.md', '.agents/rules/verification.md', '.agents/rules/security.md', '.agents/rules/environment.md',
  '.agents/rules/antigravity-permissions.md', 'docs/db-changes.md', 'docs/agent-state/README.md', 'eslint.boundaries.config.mjs', 'steiger.config.ts'];
if (tools.includes('claude')) req.push('CLAUDE.md', 'apps/backend/CLAUDE.md', 'apps/frontend/CLAUDE.md', '.claude/settings.json',
  ...['lib', 'pre-tool-guard', 'post-edit-format', 'pre-compact-save', 'session-start-restore', 'stop-gate'].map((h) => `.claude/hooks/${h}.mjs`));
if (tools.includes('gemini')) req.push('GEMINI.md', '.gemini/settings.json');
if (tools.includes('codex')) req.push('.codex/config.toml');
for (const f of req) if (!ex(f)) add('ERROR', `missing required file ${f}`);

// instruction file set
const instr = [];
const addIf = (f) => { if (ex(f)) instr.push(f); };
['AGENTS.md', 'CLAUDE.md', 'GEMINI.md', 'apps/backend/AGENTS.md', 'apps/backend/CLAUDE.md', 'apps/frontend/AGENTS.md', 'apps/frontend/CLAUDE.md'].forEach(addIf);
const ruleFiles = walk(P('.agents/rules')).filter((f) => f.endsWith('.md')).map(rel);
instr.push(...ruleFiles);
const text = (f) => readText(P(f));

// 2. size budgets
if (ex('AGENTS.md')) {
  const t = text('AGENTS.md');
  if (t.length > LIMITS.rootAgentsChars) add('ERROR', `AGENTS.md ${t.length} chars > ${LIMITS.rootAgentsChars}`);
  if (t.split('\n').length > LIMITS.rootAgentsLines) add('ERROR', `AGENTS.md ${t.split('\n').length} lines > ${LIMITS.rootAgentsLines}`);
}
for (const f of [...ruleFiles, ...(ex('GEMINI.md') ? ['GEMINI.md'] : [])]) {
  if (text(f).length > LIMITS.ruleChars) add('ERROR', `${f} exceeds ${LIMITS.ruleChars} chars (Antigravity truncates at 12000)`);
}
for (const f of instr.filter((x) => x.endsWith('CLAUDE.md'))) {
  if (text(f).split('\n').length > LIMITS.claudeMdLines) add('ERROR', `${f} exceeds ${LIMITS.claudeMdLines} lines`);
}
for (const f of ['apps/backend/AGENTS.md', 'apps/frontend/AGENTS.md']) {
  if (ex(f) && text(f).split('\n').length > LIMITS.nestedAgentsLines) add('WARN', `${f} exceeds ${LIMITS.nestedAgentsLines} lines`);
}

// 3. CLAUDE.md imports sibling AGENTS.md
for (const f of instr.filter((x) => x.endsWith('CLAUDE.md'))) {
  const sib = path.join(path.dirname(P(f)), 'AGENTS.md');
  if (!fs.existsSync(sib)) continue;
  const first = text(f).split('\n').map((l) => l.trim()).find((l) => l && !/^<!-- agent-brain:/.test(l));
  if (!text(f).split('\n').some((l) => l.trim() === '@AGENTS.md')) add('ERROR', `${f} does not import @AGENTS.md`);
  else if (first !== '@AGENTS.md') add('INFO', `${f}: @AGENTS.md is present but user text precedes it`);
}

// 4. hidden unicode across instruction files, skills, hooks
const scan = new Set(instr);
for (const d of ['.agents/skills', '.claude/skills', '.claude/hooks']) for (const f of walk(P(d))) if (/\.(md|mjs|json|tpl|toml)$/.test(f)) scan.add(rel(f));
['.claude/settings.json', '.codex/config.toml', '.gemini/settings.json'].forEach((f) => ex(f) && scan.add(f));
for (const f of scan) if (hasHiddenUnicode(readText(P(f)))) add('ERROR', `hidden Unicode in ${f}`);

// 5. routing table paths
if (ex('AGENTS.md')) {
  const t = text('AGENTS.md');
  const sec = t.split(/^##\s+Routing/m)[1];
  if (!sec) add('ERROR', 'AGENTS.md has no Routing section');
  else for (const m of sec.split(/^##\s/m)[0].matchAll(/`([^`]+)`/g)) if (!ex(m[1])) add('ERROR', `routing path does not exist: ${m[1]}`);
}

// 6. placeholders
for (const f of instr) {
  const t = text(f);
  if (/\{\{[^}]*\}\}/.test(t)) add('ERROR', `unresolved {{token}} in ${f}`);
  if (/<(?:your|todo|placeholder|insert|fill)[^>\n]*>/i.test(t) || /\bTODO\b/.test(t)) add('ERROR', `placeholder text in ${f}`);
}

// 7. duplication: 4+ consecutive identical non-trivial lines shared by two instruction files
const windows = new Map();
for (const f of instr) {
  const lines = text(f).split('\n').map((l) => l.trim());
  for (let i = 0; i + 4 <= lines.length; i++) {
    const w = lines.slice(i, i + 4);
    if (w.some((l) => l.length < 6)) continue;
    const k = w.join('\n');
    if (!windows.has(k)) windows.set(k, new Set());
    windows.get(k).add(f);
  }
}
const dupPairs = new Set();
for (const fs_ of windows.values()) if (fs_.size > 1 && ![...fs_].every((x) => x.endsWith('CLAUDE.md'))) dupPairs.add([...fs_].sort().join(' <-> '));
for (const p of dupPairs) add('ERROR', `duplicated block (4+ lines) between ${p}`);

// 8. parseable configs and hook paths
const settings = ex('.claude/settings.json') ? readJson(P('.claude/settings.json'), null) : undefined;
if (settings === null) add('ERROR', '.claude/settings.json does not parse');
if (settings) {
  for (const entries of Object.values(settings.hooks || {})) for (const e of entries) for (const h of e.hooks || []) {
    const m = /\.claude\/hooks\/[\w.-]+\.mjs/.exec(h.command || '');
    if (m && !ex(m[0])) add('ERROR', `hook command path missing: ${m[0]}`);
  }
}
if (ex('.gemini/settings.json') && readJson(P('.gemini/settings.json'), null) === null) add('ERROR', '.gemini/settings.json does not parse');
if (ex('.codex/config.toml')) {
  const t = text('.codex/config.toml');
  const bad = t.split('\n').filter((l) => l.trim() && !/^\s*(#|\[|[A-Za-z0-9_.\-"]+\s*=)/.test(l));
  if (bad.length) add('ERROR', `.codex/config.toml has lines that are not TOML key/table/comment: ${bad[0]}`);
}

// 9. secrets
for (const f of instr) for (const re of SECRET_RES) if (re.test(text(f))) add('ERROR', `secret-like pattern in ${f}`);

// 10. skill mirror
for (const f of syncSkills(root, { check: true }).findings) add(f.startsWith('DRIFT') ? 'ERROR' : 'WARN', `skill mirror: ${f}`);

// 11. lint wiring
const pkg = readJson(P('package.json'), null);
const wired = ['eslint.config.mjs', 'eslint.config.js', 'eslint.config.ts'].some((c) => ex(c) && /eslint\.boundaries\.config/.test(text(c)));
if (!wired) add('WARN', 'no eslint.config.* imports eslint.boundaries.config.mjs yet (wire it in; this skill does not edit your lint setup)');
if (pkg) {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const d of ['eslint', 'eslint-plugin-boundaries', 'oxlint', 'prettier', 'steiger']) if (!(d in deps)) add('WARN', `devDependency not installed: ${d} (see reference/dependencies.md)`);
}

// 12. overclaim words in generated files
for (const f of instr) if (OVERCLAIM_RE.test(text(f))) add('WARN', `overclaim wording in ${f}`);

// 13. user-modified
for (const [f, h] of Object.entries(lock.files || {})) if (ex(f) && sha256(text(f)) !== h) add('INFO', `user-modified: ${f}`);

for (const l of out) console.log(l);
const errs = out.filter((l) => l.startsWith('ERROR')).length;
console.log(`check-brain: ${errs} error(s), ${out.filter((l) => l.startsWith('WARN')).length} warning(s)`);
process.exit(errs ? 1 : 0);
