// Boundary rules for eslint-plugin-boundaries (flat config). Import this array from eslint.config.mjs:
//   import boundaries from './eslint.boundaries.config.mjs';  export default [ ...yourConfigs, ...boundaries ];
import boundariesPlugin from 'eslint-plugin-boundaries';

const be = 'apps/backend/src';
const fe = 'apps/frontend/src';
const layers = ['app', 'pages', 'widgets', 'features', 'entities', 'shared'];

const elements = [
  { type: 'be-feature', pattern: `${be}/features/*`, capture: ['slice'] },
  { type: 'be-platform', pattern: `${be}/platform` },
  { type: 'be-db', pattern: `${be}/db` },
  { type: 'shared-pkg', pattern: 'packages/shared/src' },
  ...layers.map((l) => ({ type: `fe-${l}`, pattern: `${fe}/${l}/*`, capture: ['slice'] })),
  { type: 'fe-app', pattern: `${fe}/app` },
  { type: 'fe-shared-root', pattern: `${fe}/shared` },
];

const allow = (from, tos) => ({ from: { element: { type: from } }, allow: { to: { element: { types: tos } } } });
const below = (i) => layers.slice(i + 1).map((l) => `fe-${l}`);

export default [
  {
    files: [`${be}/**/*.{ts,tsx,js,mjs}`, `${fe}/**/*.{ts,tsx,js,mjs}`, 'packages/shared/src/**/*.{ts,js}'],
    plugins: { boundaries: boundariesPlugin },
    settings: { 'boundaries/elements': elements },
    rules: {
      // Public API only: block imports that reach inside a slice (heuristic path patterns; slice-internal relative imports are unaffected).
      'no-restricted-imports': ['error', { patterns: [{ group: ['**/features/*/*', '**/entities/*/*', '**/widgets/*/*', '**/pages/*/*', '!**/*/index', '!**/*/index.*'], message: 'Import the slice through its index.ts public API only.' }] }],
      'boundaries/dependencies': [2, {
        default: 'disallow',
        policies: [
          // Backend: a feature may use platform, db, and shared code, plus its own files. Never another feature.
          allow('be-feature', ['be-platform', 'be-db', 'shared-pkg']),
          allow('be-platform', ['be-platform', 'be-db', 'shared-pkg']),
          allow('be-db', ['be-db', 'shared-pkg']),
          allow('shared-pkg', ['shared-pkg']),
          // Frontend: each layer depends only on layers below it. Same-layer cross-slice imports are not allowed.
          allow('fe-app', [...layers.slice(1).map((l) => `fe-${l}`), 'fe-shared-root', 'shared-pkg']),
          ...layers.slice(1, -1).map((l, i) => allow(`fe-${l}`, [...below(i + 1), 'fe-shared-root', 'shared-pkg'])),
          allow('fe-shared', ['fe-shared', 'fe-shared-root', 'shared-pkg']),
          allow('fe-shared-root', ['fe-shared-root', 'shared-pkg']),
        ],
      }],
    },
  },
];
