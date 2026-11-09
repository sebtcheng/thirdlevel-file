import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'api/tests/**/*.{test,spec}.{js,ts}',
      'ui/tests/**/*.{test,spec}.{js,ts}',
      'ui/src/**/*.{test,spec}.{js,ts}',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.claude/**',
      '**/.agents/**',
      '**/e2e/**',
      '**/coverage/**',
      '**/.logs/**',
      '**/scratch/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      thresholds: {
        lines: 10,
        branches: 10,
        functions: 10,
        statements: 10,
      },
    },
  },
});

