/** Boundary and cycle rules for the API feature folders (and cycles in the UI). Run: npm run lint */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular imports make a feature impossible to load or change in isolation.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'features-import-other-features-only-via-index',
      severity: 'error',
      comment: 'A feature may use another feature only through that feature\'s index.js public API.',
      from: { path: '^api/src/features/([^/]+)/' },
      to: { path: '^api/src/features/', pathNot: ['^api/src/features/$1/', '^api/src/features/[^/]+/index\.js$'] },
    },
    {
      name: 'shared-kernel-must-not-import-features',
      severity: 'error',
      comment: 'config, utils, middleware and services are shared; they must not depend on a feature.',
      from: { path: '^api/src/(config|utils|middleware|services)/' },
      to: { path: '^api/src/features/' },
    },
    {
      name: 'app-wiring-only-via-feature-index',
      severity: 'error',
      comment: 'app.js, cron.js, index.js and routes/ reach into a feature only through its index.js.',
      from: { path: '^api/src/(app|cron|index)\.js$|^api/src/routes/' },
      to: { path: '^api/src/features/', pathNot: '^api/src/features/[^/]+/index\.js$' },
    },
    {
      name: 'ui-does-not-import-api',
      severity: 'error',
      from: { path: '^ui/src/' },
      to: { path: '^api/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: false,
    exclude: { path: '(^|/)(dist|node_modules)/' },
  },
};
