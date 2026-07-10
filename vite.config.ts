import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  
  define: {
    // Prevent process references in client code
    global: 'globalThis',
  },
  
  server: {
    allowedHosts: true,
    fs: {
      // Allow serving files from the project root
      strict: false
    }
  },
  optimizeDeps: {
    include: []
  },
  resolve: {
    alias: {
      lodash: 'lodash-es',
      '@opentelemetry/api': fileURLToPath(new URL('./src/lib/server/opentelemetry-noop.ts', import.meta.url)),
    },
    extensions: ['.js', '.ts', '.svelte']
  },
  build: {
    target: 'esnext',
    sourcemap: true
  }
});