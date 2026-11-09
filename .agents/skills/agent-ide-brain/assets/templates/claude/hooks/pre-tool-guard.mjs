// PreToolUse guard. Exit 0 allow, exit 2 block. Best-effort pattern matching; the sandbox is the real control.
import path from 'node:path';
import { readPayload, projectRoot, loadConfig, readState, writeState, block, budget, HIDDEN_RE } from './lib.mjs';

budget();
const payload = readPayload();
const root = projectRoot(payload);
const cfg = loadConfig(root);
const tool = payload.tool_name || '';
const input = payload.tool_input || {};

// ---- circuit breaker: counts every tool call per session ----
{
  const sid = String(payload.session_id || 'default');
  let st = readState(root, 'calls.json', null);
  if (!st || st.session !== sid) st = { session: sid, count: 0, tripped: false };
  st.count += 1;
  if (st.count > cfg.maxToolCalls) {
    st.tripped = true;
    writeState(root, 'calls.json', st);
    block('CB1-tool-call-cap', `tool call ${st.count} exceeds the cap of ${cfg.maxToolCalls}`, 'synthesize findings and stop');
  }
  writeState(root, 'calls.json', st);
}

const norm = (p) => String(p || '').replace(/\\/g, '/');

// ---- Bash ----
function checkBash(cmd) {
  const c = String(cmd || '');
  // The skill's own scripts (plain args only, no shell operators) and the Tier 2 marker command.
  if (/^\s*node\s+(?:\.\/)?\.(?:agents|claude)\/skills\/agent-ide-brain\/scripts\/[\w.-]+\.mjs(?:\s+[\w.:\/=@-]+)*\s*$/.test(c)) return;
  if (/^\s*node\s+(?:\.\/)?\.claude\/hooks\/post-edit-format\.mjs\s+--mark-tier2\s*$/.test(c)) return;

  const segments = c.split(/&&|\|\||;|\n/);
  const localHost = (h) => cfg.localDbHosts.includes(String(h).replace(/^\[|\]$/g, ''));

  for (const s of segments) {
    if (/\brm\s+(?:-[a-zA-Z]*\s+)*-[a-zA-Z]*[rR]/.test(s) || /Remove-Item\b[^\n]*-Recurse/i.test(s) || /\brmdir\s+\/s/i.test(s)) {
      const args = s.split(/\s+/).slice(1).filter((x) => x && !x.startsWith('-') && !/^\/[sqSQ]$/.test(x));
      const ok = args.length > 0 && args.every((a) => /(^|[\/\\])(node_modules|dist|build|coverage|tmp)([\/\\]|$)/.test(a));
      if (!ok) block('D1-destructive-delete', 'recursive delete outside node_modules|dist|build|coverage|tmp', 'delete only those folders, or ask the human');
    }
  }
  if (/git\s+push\b[^\n]*(--force\b|--force-with-lease|\s-f\b)/.test(c)) block('G1-force-push', 'force push', 'a normal push after asking the human');
  if (/git\s+reset\s+--hard/.test(c)) block('G2-reset-hard', 'git reset --hard discards work', 'git stash or ask the human');
  if (/git\s+clean\s+-[a-z]*f/.test(c)) block('G3-clean', 'git clean -f deletes untracked files', 'list files with git status and ask the human');
  if (/git\s+commit\b[^\n]*--no-verify/.test(c)) block('G4-no-verify', 'skipping commit hooks', 'fix the failing check and commit normally');
  if (/\b(DROP\s+(DATABASE|TABLE)|TRUNCATE)\b/i.test(c)) block('DB1-destructive-sql', 'destructive SQL', 'generate a reversible migration per docs/db-changes.md');
  if (/--dangerously-skip-permissions/.test(c)) block('P1-skip-permissions', 'permission bypass flag', 'run with normal permission prompts');
  if (/\b(curl|wget|iwr|Invoke-WebRequest)\b[^\n]*\|\s*(sh|bash|zsh|iex|Invoke-Expression|node|python3?)\b/i.test(c)) block('N1-pipe-to-shell', 'piping a download into a shell', 'download, review, then run');
  if (/\b(ssh|scp|rsync)(\.exe)?\s/.test(c)) block('R4-remote-host', 'ssh/scp/rsync reach remote hosts', 'ask the human before touching any VM');
  for (const m of c.matchAll(/\b(psql|pg_dump|pg_restore)(?:\.exe)?\b([^\n|;&]*)/g)) {
    const args = m[2];
    const hosts = [];
    for (const h of args.matchAll(/(?:-h|--host)[\s=]+([^\s"']+)/g)) hosts.push(h[1]);
    for (const u of args.matchAll(/postgres(?:ql)?:\/\/(?:[^@\s\/]*@)?(\[[^\]]+\]|[^:\/\s?]+)/g)) hosts.push(u[1]);
    if (hosts.some((h) => !localHost(h))) block('R4-remote-db', 'database client targets a non-local host', 'use a local or scratch DB, or ask the human');
  }
  if (/drizzle-kit\s+push/.test(c) && !cfg.localDbHosts.some((h) => c.includes(h))) block('DB2-drizzle-push', 'drizzle-kit push without a local DB host', 'drizzle-kit generate, rehearse locally, show a rollback plan');
  if (/\b(cat|type|more|less|head|tail|bat|Get-Content|gc|Select-String|sls)\b[^\n|;&]*\.env(?!\.(?:example|sample|template))\b/i.test(c)) block('R1-read-env', 'reading .env would expose secrets', 'read .env.example or ask the human for the variable name only');
  if (!cfg.allowInstall && /\b(npm|npm\.cmd|pnpm|yarn)\s+(install|i|ci|add)\b/.test(c)) block('I1-install', 'package install without approval', 'ask the human; they can set allowInstall in .agents/brain.config.json');
}

// ---- Edit / Write / MultiEdit ----
function checkEdit() {
  const target = norm(path.isAbsolute(String(input.file_path || '')) ? path.relative(root, input.file_path) : input.file_path);
  const chunks = [input.content, input.new_string, ...(Array.isArray(input.edits) ? input.edits.map((e) => e.new_string) : [])].filter((x) => typeof x === 'string');
  if (chunks.some((x) => HIDDEN_RE.test(x))) block('U1-hidden-unicode', 'write adds hidden Unicode characters', 'remove the invisible characters');
  const prot = (cfg.protectedPaths.length ? cfg.protectedPaths : []).map(norm);
  const hit = prot.find((p) => (p.endsWith('/') ? target.startsWith(p) : target === p || target.startsWith(p + '.') || target.split('/').pop() === p));
  const envHit = /(^|\/)\.env(?!\.(example|sample|template)$)/.test(target);
  if ((hit || envHit) && process.env.AGENT_BRAIN_ALLOW_PROTECTED !== '1') {
    block('PP1-protected-path', `${target} is protected`, 'ask the human, who can approve by setting AGENT_BRAIN_ALLOW_PROTECTED=1 for this action');
  }
}

if (tool === 'Bash') checkBash(input.command);
else if (['Edit', 'Write', 'MultiEdit'].includes(tool)) checkEdit();
process.exit(0);
