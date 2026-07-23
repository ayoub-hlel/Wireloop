import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    svelte({
      preprocess: false,
      compilerOptions: {
        generate: 'dom',
        dev: true,
      },
    }),
  ],
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
      'vitest.setup.ts',
    ],
    deps: {
      inline: [/svelte/],
    },
    setupFiles: ['./vitest.setup.ts'],
    globalSetup: ['./tests/setup.ts'],
  },
  resolve: {
    conditions: ['browser', 'import', 'module'],
    alias: {
      '@': resolve(__dirname, 'src'),
      '$lib': resolve(__dirname, 'src/lib'),
      '$app': resolve(__dirname, 'src/tests/mocks/app'),
      '$env/dynamic/private': resolve(__dirname, 'src/tests/mocks/env/private.ts'),
    },
  },
});