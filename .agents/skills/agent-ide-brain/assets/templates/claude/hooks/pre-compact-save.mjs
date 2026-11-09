// PreCompact. Serializes a small state file from git and the Tier 2 marker. Never copies transcript text.
import { readPayload, projectRoot, git, changedFiles, readState, writeState, budget, HARD_RULES } from './lib.mjs';

budget();
const payload = readPayload();
const root = projectRoot(payload);
const tier2 = readState(root, 'tier2-pass.json', null);
writeState(root, 'session-state.json', {
  savedAt: new Date().toISOString(),
  branch: (git(root, ['rev-parse', '--abbrev-ref', 'HEAD']) || '').trim() || null,
  changedFiles: changedFiles(root).slice(0, 50),
  tier2: tier2 ? { diffHash: tier2.diffHash, at: tier2.at } : null,
  hardRules: HARD_RULES,
});
process.exit(0);
