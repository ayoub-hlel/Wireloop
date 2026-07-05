import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'src/tests/**/*.{test,spec}.{js,ts}',
      'src/tests/**/*.ts',
      'tests/**/*.{test,spec}.{js,ts}',
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      '.svelte-kit/**',
      'src/tests/mocks/**',
      'src/tests/fake-block.ts',
      'src/tests/tests.helper.ts',
      'tests/setup.ts',
    ],
    deps: {
      inline: [/svelte/],
    },
    globalSetup: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '$lib': resolve(__dirname, 'src/lib'),
      '$app': resolve(__dirname, 'src/tests/mocks/app'),
    },
  },
});
