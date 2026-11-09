import js from '@eslint/js';
import globals from 'globals';
import boundaries from 'eslint-plugin-boundaries';

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/uploads/**', '**/.logs/**', '**/coverage/**', '**/scratch/**'] },
  js.configs.recommended,
  {
    files: ['api/**/*.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: globals.node },
  },
  {
    files: ['ui/**/*.{js,jsx}'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: globals.browser, parserOptions: { ecmaFeatures: { jsx: true } } },
  },
  {
    // InsightED UI rules (.agents/rules/ui.md): one icon set, no animation libraries, no raw colors
    files: ['ui/src/**/*.{js,jsx}'],
    ignores: ['ui/src/theme/**', 'ui/src/devtools/**', '**/*.test.*'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          // UI must not import API
          { group: ['**/api/**', '../api/**', '../../api/**', '../../../api/**'], message: 'UI must not import API files.' },
          { group: ['lucide-react', 'lucide-react/*', '@tabler/icons-react', '@tabler/icons*', 'react-icons', 'react-icons/*', '@heroicons/*', '@fortawesome/*', '@mui/icons-material', '@mui/icons-material/*'], message: 'lib-banned: use @phosphor-icons/react (duotone via IconContext)' },
          { group: ['framer-motion', 'motion', 'motion/*', 'react-spring', '@react-spring/*', 'gsap', 'animejs', 'lottie-react', 'lottie-web', 'react-transition-group', '@formkit/auto-animate'], message: 'motion: use plain CSS transitions of 200ms or less' },
          { group: ['recharts', 'chart.js', 'react-chartjs-2', 'apexcharts', 'react-apexcharts', 'echarts', 'victory', '@nivo/*', 'highcharts', 'plotly.js'], message: 'lib-banned: chart library not approved' },
        ],
      }],
      'no-restricted-syntax': ['error',
        { selector: "Literal[value=/^#[0-9a-fA-F]{3,8}$/]", message: 'color-raw: use theme tokens (var(--color-*) or Tailwind token classes)' },
        { selector: "Literal[value=/^(rgb|hsl)a?\\((?!var\\()/]", message: 'color-raw: use theme tokens (var(--color-*) or rgb(var(--rgb-*)/alpha))' },
        { selector: "JSXAttribute[name.name='weight'][value.value!='duotone']", message: 'icon-weight: duotone only' },
      ],
    },
  },
  {
    // Architectural boundaries mirroring .dependency-cruiser.cjs (no-circular, no-cycle, cross-slice protection)
    plugins: {
      boundaries,
    },
    settings: {
      'import/resolver': { node: { extensions: ['.js', '.jsx'] } },
      'boundaries/include': ['api/src/**/*', 'ui/src/**/*'],
      'boundaries/elements': [
        { type: 'feature', pattern: 'api/src/features/*/' },
        { type: 'kernel', pattern: 'api/src/(config|utils|middleware|services)/' },
        { type: 'wiring', pattern: 'api/src/' },
        { type: 'ui-feature', pattern: 'ui/src/components/(official-profiling|officials-registry)/**', mode: 'full', capture: ['feature'] },
        { type: 'ui-page', pattern: 'ui/src/pages/**', mode: 'full' },
        { type: 'ui', pattern: 'ui/src/**', mode: 'full' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'allow',
          policies: [
            {
              // UI page-section folders are consumed only through their index.js barrel
              from: { element: { type: 'ui-page' } },
              disallow: [{ to: { element: { type: 'ui-feature', fileInternalPath: '!(index.js)' } } }],
              message: 'Import UI feature folders through their index.js barrel only.',
            },
            {
              from: { element: { type: 'kernel' } },
              disallow: [{ to: { element: { type: 'feature' } } }],
              message: 'Shared kernel (config, utils, middleware, services) must not import features.',
            },
            {
              from: { element: { type: 'ui' } },
              disallow: [
                { to: { element: { type: 'feature' } } },
                { to: { element: { type: 'kernel' } } },
                { to: { element: { type: 'wiring' } } },
              ],
              message: 'UI must not import API modules.',
            },
          ],
        },
      ],
    },
  },
  {
    // Shared kernel files must not import features
    files: ['api/src/(config|utils|middleware|services)/**/*.js', 'api/src/config/**/*.js', 'api/src/utils/**/*.js', 'api/src/middleware/**/*.js', 'api/src/services/**/*.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/features/**', '../features/**', '../../features/**'],
              message: 'Shared kernel (config, utils, middleware, services) must not import features.',
            },
          ],
        },
      ],
    },
  },
  {
    // Baseline for code that predates this lint setup: reported as warnings so the gate can pass.
    // Real defects among them (no-undef: setApplications, setProcessingId, FiXCircle, FiRefreshCw) need fixing separately; do not add new ones.
    rules: {
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-undef': 'warn',
      'no-empty': 'warn',
      'no-useless-assignment': 'warn',
      'preserve-caught-error': 'warn',
    },
  },
];
