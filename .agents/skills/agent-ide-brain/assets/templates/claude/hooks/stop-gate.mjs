// Stop gate. Blocks stopping once (bounded) when source changed since the last green Tier 2.
import { readPayload, projectRoot, loadConfig, readState, writeState, sourceDiffHash, block, budget } from './lib.mjs';

budget();
const payload = readPayload();
if (payload.stop_hook_active === true) process.exit(0);
const root = projectRoot(payload);
const cfg = loadConfig(root);

const calls = readState(root, 'calls.json', null);
if (calls && (calls.tripped === true || calls.count >= cfg.maxToolCalls)) process.exit(0);

const { hash, files } = sourceDiffHash(root);
if (files.length === 0) process.exit(0);
const marker = readState(root, 'tier2-pass.json', null);
if (marker && marker.diffHash === hash) process.exit(0);

const stops = readState(root, 'stop-blocks.json', { count: 0 });
if (stops.count >= cfg.maxStopBlocks) process.exit(0);
writeState(root, 'stop-blocks.json', { count: stops.count + 1 });

const t2 = cfg.commands?.tier2 || 'the repo Tier 2 command';
block('R3-tier2-before-done', `${files.length} source file(s) changed since the last green Tier 2`, `run Tier 2 once in the foreground (${t2}), then run node .claude/hooks/post-edit-format.mjs --mark-tier2 if the marker was not written, then stop`);
