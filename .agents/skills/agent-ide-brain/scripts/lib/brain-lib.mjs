// Shared helpers for agent-ide-brain scripts. Node >= 18, no network, no shell calls.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const SKILL_NAME = 'agent-ide-brain';
export const SKILL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const TEMPLATES = path.join(SKILL_ROOT, 'assets', 'templates');

// Hidden Unicode: zero-width, bidi controls, invisible operators, BOM, tag characters.
export const HIDDEN_UNICODE_RE = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]|\uDB40[\uDC00-\uDC7F]/;
export const LIMITS = {
  rootAgentsChars: 8000,
  rootAgentsLines: 120,
  ruleChars: 10000,
  claudeMdLines: 200,
  nestedAgentsLines: 60,
};

export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i++; }
    } else out._.push(a);
  }
  return out;
}

export const toPosix = (p) => p.split(path.sep).join('/').replace(/\\/g, '/');
export const normalizeLf = (s) => s.replace(/\r\n?/g, '\n');
export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
export const exists = (p) => fs.existsSync(p);

export function readText(p) {
  return normalizeLf(fs.readFileSync(p, 'utf8'));
}
export function writeText(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, normalizeLf(content), 'utf8');
}
export function readJson(p, fallback) {
  try { return JSON.parse(readText(p)); } catch { return fallback; }
}
export const stringifyJson = (o) => JSON.stringify(o, null, 2) + '\n';

// Resolve a repo-relative path and refuse anything that escapes the root.
export function safeResolve(root, rel) {
  const abs = path.resolve(root, rel);
  const r = path.resolve(root);
  if (abs !== r && !abs.startsWith(r + path.sep)) throw new Error(`path outside repo root: ${rel}`);
  return abs;
}

// ---------- template rendering ----------
export function render(tpl, vars, where = 'template') {
  const missing = new Set();
  const out = tpl.replace(/\{\{\s*(json:)?([A-Za-z0-9_.]+)\s*\}\}/g, (m, json, key) => {
    const v = key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), vars);
    if (v === undefined || v === null) { missing.add(key); return m; }
    return json ? JSON.stringify(v) : String(v);
  });
  if (missing.size) throw new Error(`unresolved token(s) in ${where}: ${[...missing].join(', ')}`);
  return normalizeLf(out);
}
export const readTemplate = (rel) => readText(path.join(TEMPLATES, rel));

// ---------- managed blocks ----------
export function markers(kind, id) {
  return kind === 'toml'
    ? { begin: `# agent-brain:begin ${id}`, end: `# agent-brain:end ${id}` }
    : { begin: `<!-- agent-brain:begin ${id} -->`, end: `<!-- agent-brain:end ${id} -->` };
}
export function wrapBlock(kind, id, body) {
  const m = markers(kind, id);
  return `${m.begin}\n${body.replace(/\n+$/, '')}\n${m.end}\n`;
}
export function findBlock(text, kind, id) {
  const m = markers(kind, id);
  const s = text.indexOf(m.begin);
  if (s < 0) return null;
  const e = text.indexOf(m.end, s);
  if (e < 0) return null;
  return { start: s, end: e + m.end.length };
}
// Replace the managed block, or insert it (top|bottom) when absent. Never touches text outside.
export function upsertBlock(text, kind, id, body, placement = 'bottom') {
  const block = wrapBlock(kind, id, body).replace(/\n$/, '');
  const f = findBlock(text, kind, id);
  if (f) return text.slice(0, f.start) + block + text.slice(f.end);
  if (!text.trim()) return block + '\n';
  return placement === 'top' ? `${block}\n\n${text.replace(/^\n+/, '')}` : `${text.replace(/\n*$/, '\n\n')}${block}\n`;
}

// ---------- JSON deep merge ----------
export const isManagedHookEntry = (e) =>
  e && Array.isArray(e.hooks) && e.hooks.some((h) => typeof h?.command === 'string' && h.command.includes('.claude/hooks/'));
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

// User values win for scalars; arrays are unioned; managed hook entries are replaced by the template's.
export function mergeJson(existing, tpl, keyPath = []) {
  if (isObj(existing) && isObj(tpl)) {
    const out = { ...existing };
    for (const k of Object.keys(tpl)) out[k] = k in existing ? mergeJson(existing[k], tpl[k], [...keyPath, k]) : tpl[k];
    return out;
  }
  if (Array.isArray(existing) && Array.isArray(tpl)) {
    if (keyPath[0] === 'hooks' && keyPath.length === 2) {
      return [...existing.filter((e) => !isManagedHookEntry(e)), ...tpl];
    }
    const out = [...existing];
    for (const item of tpl) if (!out.some((x) => JSON.stringify(x) === JSON.stringify(item))) out.push(item);
    return out;
  }
  return existing;
}

// ---------- scanning ----------
export const hasHiddenUnicode = (text) => HIDDEN_UNICODE_RE.test(text);
export const SECRET_RES = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/@]+@/i,
];
export const OVERCLAIM_RE = /guarantee|zero-regression|mathematically/i;

export function walk(dir, { skip = ['node_modules', '.git', 'backups', 'state'] } = {}) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, { skip }));
    else out.push(p);
  }
  return out.sort();
}

// ---------- git (only allowed shell-out besides repo commands) ----------
export function git(root, args) {
  try {
    return normalizeLf(execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }));
  } catch { return null; }
}

// ---------- defaults / config ----------
export const DEFAULT_PROTECTED = [
  'AGENTS.md', 'CLAUDE.md', 'GEMINI.md', '.agents/', '.claude/', '.codex/', '.gemini/',
  'eslint.boundaries.config.mjs', 'steiger.config.ts', '.github/workflows/', '.env',
];

export function defaultConfig(root, det) {
  const name = (det.packageName || path.basename(path.resolve(root)) || 'repo')
    .replace(/^@[^/]+\//, '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'repo';
  const s = det.scripts || {};
  const pm = det.packageManager?.prefix || 'npm';
  const npx = pm.startsWith('npm') ? (det.os === 'win32' ? 'npx.cmd' : 'npx') : pm;
  const run = (n) => `${pm} run ${n}`;
  const tier2Parts = ['lint:fast', 'lint', 'typecheck', 'test', 'build'].filter((n) => s[n]).map(run);
  return {
    version: 1,
    repoName: name,
    packageScope: `@${name}`,
    mode: 'bootstrap',
    tools: ['claude', 'codex', 'gemini'],
    modules: { ciWorkflow: true, preCommit: false, devcontainer: false, codeKnowledgeGraph: false },
    commands: {
      tier1: `${npx} vitest run --reporter=dot`,
      tier2: tier2Parts.join(' && '),
      lint: s.lint ? run('lint') : '',
      test: s.test ? run('test') : '',
      build: s.build ? run('build') : '',
      typecheck: s.typecheck ? run('typecheck') : '',
    },
    maxToolCalls: 300,
    maxStopBlocks: 3,
    localDbHosts: ['localhost', '127.0.0.1', '::1'],
    protectedHosts: [],
    allowInstall: false,
    protectedPaths: DEFAULT_PROTECTED,
    environment: {
      os: det.os, shell: det.shell, node: det.node,
      packageManager: pm, npx,
    },
  };
}

// Plan entries: what the skill manages. kind: md | toml | json | copy | scaffold | config | gitignore
export function buildEntries(root, config, det) {
  const e = [];
  const tools = config.tools || [];
  const has = (t) => tools.includes(t);
  const E = (p, tpl, kind, extra = {}) => e.push({ path: p, tpl, kind, ...extra });
  const rules = ['architecture', 'verification', 'security', 'environment', 'antigravity-permissions'];

  E('AGENTS.md', 'AGENTS.root.md.tpl', 'md');
  E('apps/backend/AGENTS.md', 'AGENTS.backend.md.tpl', 'md');
  E('apps/frontend/AGENTS.md', 'AGENTS.frontend.md.tpl', 'md');
  if (has('claude')) {
    for (const d of ['', 'apps/backend/', 'apps/frontend/']) E(`${d}CLAUDE.md`, 'CLAUDE.md.tpl', 'md', { placement: 'top' });
    E('.claude/settings.json', 'claude/settings.json.tpl', 'json');
    for (const h of ['lib', 'pre-tool-guard', 'post-edit-format', 'pre-compact-save', 'session-start-restore', 'stop-gate']) {
      E(`.claude/hooks/${h}.mjs`, `claude/hooks/${h}.mjs`, 'copy', { raw: true });
    }
  }
  if (has('gemini')) {
    E('GEMINI.md', 'GEMINI.md.tpl', 'md');
    E('.gemini/settings.json', 'gemini/settings.json.tpl', 'json');
  }
  if (has('codex')) E('.codex/config.toml', 'codex/config.toml.tpl', 'toml');
  for (const r of rules) E(`.agents/rules/${r}.md`, `rules/${r}.md.tpl`, 'md');
  E('eslint.boundaries.config.mjs', 'lint/eslint.boundaries.config.mjs.tpl', 'copy');
  E('steiger.config.ts', 'lint/steiger.config.ts.tpl', 'copy');
  E('docs/db-changes.md', 'docs/db-changes.md.tpl', 'md');
  E('docs/agent-state/README.md', 'docs/agent-state-README.md.tpl', 'md');
  if (config.modules?.ciWorkflow) E('.github/workflows/brain-check.yml', 'ci/brain-check.yml.tpl', 'copy');
  E('.agents/brain.config.json', 'brain.config.json.tpl', 'config');
  E('package.json', 'scaffold/package.json.tpl', 'scaffold', { skeletonOnly: true });
  E('tsconfig.base.json', 'scaffold/tsconfig.base.json.tpl', 'scaffold', { skeletonOnly: true });
  E('.env.example', 'scaffold/env.example.tpl', 'scaffold', { skeletonOnly: true });
  E('.gitignore', 'scaffold/gitignore.tpl', 'scaffold', { skeletonOnly: true });
  E('.gitignore', null, 'gitignore');
  return e;
}

// Routing table rows built only from files/skills that exist (or are about to be written).
export function routingTable(root, entries, config) {
  const willExist = (p) => fs.existsSync(path.join(root, p)) || entries.some((x) => x.path === p && x.kind !== 'scaffold');
  const rows = [
    ['Layout, slices, import boundaries', '.agents/rules/architecture.md'],
    ['Running tests, lint, verification', '.agents/rules/verification.md'],
    ['Secrets, hooks, protected paths', '.agents/rules/security.md'],
    ['OS, shell, command prefix', '.agents/rules/environment.md'],
    ['Antigravity terminal policy', '.agents/rules/antigravity-permissions.md'],
    ['Backend work', 'apps/backend/AGENTS.md'],
    ['Frontend work', 'apps/frontend/AGENTS.md'],
    ['Schema or migration change', 'docs/db-changes.md'],
    ['Session summary (append-only)', 'docs/agent-state/README.md'],
  ];
  const skillsDir = path.join(root, '.agents', 'skills');
  if (fs.existsSync(skillsDir)) {
    for (const d of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (d.isDirectory() && fs.existsSync(path.join(skillsDir, d.name, 'SKILL.md'))) {
        rows.push([`Skill on demand: ${d.name}`, `.agents/skills/${d.name}/SKILL.md`]);
      }
    }
  }
  return rows.filter(([, p]) => willExist(p)).map(([t, p]) => `| ${t} | \`${p}\` |`).join('\n');
}

export function templateVars(root, config, entries) {
  const c = config.commands || {};
  const env = config.environment || {};
  const notSet = 'not configured; ask the human';
  return {
    ...config,
    sliceExample: 'orders',
    cmdPrefix: env.packageManager || 'npm',
    npx: env.npx || 'npx',
    tier1: c.tier1 || notSet,
    tier2: c.tier2 || notSet,
    lintCmd: c.lint || notSet,
    testCmd: c.test || notSet,
    buildCmd: c.build || notSet,
    typecheckCmd: c.typecheck || notSet,
    env,
    protectedHostsText: (config.protectedHosts || []).length ? config.protectedHosts.join(', ') : 'none listed; treat every non-local host as production',
    localDbHostsText: (config.localDbHosts || []).join(', '),
    routing: routingTable(root, entries, config),
    skillName: SKILL_NAME,
  };
}

export const GITIGNORE_LINES = ['.agents/backups/', '.claude/state/', '.claude/settings.local.json'];

// Compute the action for one entry. Returns { action, reason, content, backup }
export function decide(root, entry, mode, config, ctx) {
  const abs = safeResolve(root, entry.path);
  const present = fs.existsSync(abs);
  const cur = present ? readText(abs) : null;
  const lockHash = ctx.lock.files?.[entry.path];
  const r = (action, reason, content = null, extra = {}) => ({ entry, action, reason, content, ...extra });

  if (entry.kind === 'scaffold') {
    if (!ctx.skeletonAbsent) return r('SKIP', 'monorepo skeleton exists');
    return present ? r('SKIP', 'exists; scaffold never overwrites') : r('CREATE', 'scaffold', render(readTemplate(entry.tpl), ctx.vars, entry.tpl));
  }
  if (entry.kind === 'gitignore') {
    const body = GITIGNORE_LINES.join('\n');
    const next = upsertBlock(cur ?? '', 'toml', 'gitignore', body);
    if (cur !== null && next === cur) return r('SKIP', 'unchanged');
    return r(present ? 'EDIT' : 'CREATE', 'ignore entries', next);
  }
  if (entry.kind === 'config') {
    if (present) return r('SKIP', 'user config is never overwritten');
    return r('CREATE', 'config', render(readTemplate(entry.tpl), ctx.vars, entry.tpl));
  }

  const tpl = entry.raw ? readTemplate(entry.tpl) : render(readTemplate(entry.tpl), ctx.vars, entry.tpl);
  let next;
  if (entry.kind === 'md' || entry.kind === 'toml') {
    const body = tpl;
    next = present ? upsertBlock(cur, entry.kind, 'main', body, entry.placement) : wrapBlock(entry.kind, 'main', body);
    if (mode === 'overwrite') next = wrapBlock(entry.kind, 'main', body);
  } else if (entry.kind === 'json') {
    const t = JSON.parse(tpl);
    if (present) {
      let existing;
      try { existing = JSON.parse(cur); } catch { return r('SKIP', 'existing file is not valid JSON; fix by hand', null, { blocked: true }); }
      const merged = mode === 'overwrite' ? t : mergeJson(existing, t);
      next = JSON.stringify(merged) === JSON.stringify(existing) ? cur : stringifyJson(merged);
    } else next = stringifyJson(t);
  } else next = tpl; // copy

  if (!present) return r('CREATE', 'missing', next);
  if (next === cur) return r('SKIP', 'unchanged');
  if (mode === 'bootstrap') return r('SKIP', 'exists (bootstrap never edits existing files)');
  if (mode === 'update') {
    if (entry.kind === 'copy' && lockHash && lockHash !== sha256(cur)) return r('SKIP', 'user-modified copy; use overwrite --force', null, { blocked: true });
    if (entry.kind === 'copy' && !lockHash) return r('SKIP', 'not created by this skill; use overwrite --force', null, { blocked: true });
    return r('EDIT', entry.kind === 'copy' ? 'template changed' : 'managed block/merge', next);
  }
  // overwrite
  // Overwrite needs --force when the file holds anything this skill did not generate.
  let userContent = lockHash !== sha256(cur);
  if (entry.kind === 'md' || entry.kind === 'toml') {
    const b = findBlock(cur, entry.kind, 'main');
    userContent = userContent || !b || (cur.slice(0, b.start) + cur.slice(b.end)).trim() !== '';
  } else if (entry.kind === 'json') {
    try { userContent = JSON.stringify(JSON.parse(cur)) !== JSON.stringify(JSON.parse(next)); } catch { userContent = true; }
  }
  if (userContent && !ctx.force) return r('SKIP', 'holds user content or differs from lock file; rerun with --force after human approval', null, { blocked: true });
  return r('OVERWRITE', 'replace after backup', next, { backup: true });
}

export function loadContext(root, config, det, force = false) {
  const lock = readJson(path.join(root, '.agents', 'brain.lock.json'), { files: {} });
  const entries = buildEntries(root, config, det);
  const vars = templateVars(root, config, entries);
  const skeletonAbsent = !fs.existsSync(path.join(root, 'package.json'));
  return { lock, entries, vars, skeletonAbsent, force };
}
