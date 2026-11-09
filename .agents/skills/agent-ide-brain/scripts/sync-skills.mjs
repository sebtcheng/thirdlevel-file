#!/usr/bin/env node
// Mirror .agents/skills/<name>/ to .claude/skills/<name>/ (copy, not symlink). Canonical side wins.
// Mirror-only files are reported, never deleted. --check reports drift and writes nothing.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, walk, sha256, toPosix } from './lib/brain-lib.mjs';

export function syncSkills(root, { check = false } = {}) {
  const src = path.join(root, '.agents', 'skills');
  const dst = path.join(root, '.claude', 'skills');
  const findings = [];
  let copied = 0;
  if (!fs.existsSync(src)) return { findings, copied };
  const hashOf = (p) => sha256(fs.readFileSync(p));
  for (const d of fs.readdirSync(src, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const sdir = path.join(src, d.name), ddir = path.join(dst, d.name);
    const sfiles = walk(sdir).map((f) => toPosix(path.relative(sdir, f)));
    for (const rel of sfiles) {
      const sp = path.join(sdir, rel), dp = path.join(ddir, rel);
      if (!fs.existsSync(dp)) findings.push(`DRIFT missing in mirror: ${d.name}/${rel}`);
      else if (hashOf(sp) !== hashOf(dp)) findings.push(`DRIFT differs: ${d.name}/${rel}`);
      else continue;
      if (!check) { fs.mkdirSync(path.dirname(dp), { recursive: true }); fs.copyFileSync(sp, dp); copied++; }
    }
    for (const f of walk(ddir)) {
      const rel = toPosix(path.relative(ddir, f));
      if (!sfiles.includes(rel)) findings.push(`MIRROR-ONLY (kept, review by hand): ${d.name}/${rel}`);
    }
  }
  return { findings, copied };
}

import { fileURLToPath } from 'node:url';
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = parseArgs(process.argv.slice(2));
  const root = path.resolve(a.root || process.cwd());
  const { findings, copied } = syncSkills(root, { check: !!a.check });
  for (const f of findings) console.log(f);
  console.log(a.check ? `${findings.filter((f) => f.startsWith('DRIFT')).length} drifted files` : `${copied} files copied`);
  process.exit(a.check && findings.some((f) => f.startsWith('DRIFT')) ? 1 : 0);
}
