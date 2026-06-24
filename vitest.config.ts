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
