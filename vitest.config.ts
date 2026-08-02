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
    include: ['tests/**/*.{test,spec}.{js,ts}'],
    exclude: [
      'node_modules/**',
      'dist/**',
      '.svelte-kit/**',
      'tests/mocks/**',
      'tests/app/fake-block.ts',
      'tests/app/tests.helper.ts',
      'vitest.setup.ts',
    ],
    deps: {
      inline: [/svelte/],
    },
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    conditions: ['browser', 'import', 'module'],
    alias: {
      '@': resolve(__dirname, 'src'),
      '$lib': resolve(__dirname, 'src/lib'),
      '$app': resolve(__dirname, 'tests/mocks/app'),
      '$env/dynamic/private': resolve(__dirname, 'tests/mocks/env/private.ts'),
    },
  },
});