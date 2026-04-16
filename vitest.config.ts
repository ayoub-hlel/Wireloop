import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'src/tests/**/*.{test,spec}.{js,ts}',
      'src/tests/**/*.ts' // Include our TDD test files
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      '.svelte-kit/**',
      'src/tests/validation/**',
      'src/tests/contract/test_auth_contract.ts',
      'src/tests/contract/test_projects_contract.ts',
      'src/tests/e2e/test_offline_functionality.ts',
      'src/tests/integration/test_auth_flows.ts',
      'src/tests/integration/test_realtime_features.ts',
      'src/tests/mocks/**',
      'src/tests/fake-block.ts',
      'src/tests/tests.helper.ts'
    ],
    deps: {
      inline: [/svelte/],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '$lib': resolve(__dirname, 'src/lib'),
      '$app': resolve(__dirname, 'src/tests/mocks/app'),
    },
  },
});
