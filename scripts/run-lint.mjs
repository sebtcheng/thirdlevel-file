import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const isWin = process.platform === 'win32';
const npx = isWin ? 'npx.cmd' : 'npx';

// Detect if format flag is passed (e.g. from automated tools like collect-evidence or CI)
const hasJsonFormat = args.some((arg) => arg === '-f' || arg === '--format=json' || arg === 'json' || arg.startsWith('--format='));

if (hasJsonFormat) {
  // Pass directly to ESLint with the requested formatter (depcruise does not use --format=json)
  const result = spawnSync(npx, ['eslint', '--config', 'eslint.config.js', 'api/src', 'api/tests', 'ui/src', 'ui/tests', ...args], {
    stdio: 'inherit',
    shell: isWin,
  });
  process.exit(result.status ?? 0);
}

// Default run: Run ESLint first, then dependency-cruiser boundary checks
const eslintResult = spawnSync(npx, ['eslint', '--config', 'eslint.config.js', 'api/src', 'api/tests', 'ui/src', 'ui/tests', ...args], {
  stdio: 'inherit',
  shell: isWin,
});

if (eslintResult.status !== 0) {
  process.exit(eslintResult.status ?? 1);
}

const depcruiseResult = spawnSync(npx, ['depcruise', '--config', '.dependency-cruiser.cjs', 'api/src', 'ui/src'], {
  stdio: 'inherit',
  shell: isWin,
});

process.exit(depcruiseResult.status ?? 0);

