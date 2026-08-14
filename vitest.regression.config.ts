import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

const envMock = `
export const env = new Proxy({}, {
  get: () => undefined,
  set: () => true,
});
`;

export default defineConfig({
  plugins: [
    svelte({
      preprocess: false,
      compilerOptions: { generate: 'dom', dev: true },
    }),
    {
      name: 'env-mock',
      resolveId(id) {
        if (id === '$env/dynamic/private') return id;
        return null;
      },
      load(id) {
        if (id === '$env/dynamic/private') return envMock;
        return null;
      },
    },
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/regression/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules/**', 'dist/**', '.svelte-kit/**'],
  },
  resolve: {
    conditions: ['browser', 'import', 'module'],
    alias: {
      '@': resolve(__dirname, 'src'),
      '$lib': resolve(__dirname, 'src/lib'),
    },
  },
});
