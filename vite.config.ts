import { sentrySvelteKit } from "@sentry/sveltekit";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [sentrySvelteKit({
    org: "ws-consulting",
    project: "javascript-sveltekit"
  }), tailwindcss(), sveltekit()],
  
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
    },
    extensions: ['.js', '.ts', '.svelte']
  },
  build: {
    target: 'esnext',
    sourcemap: true
  }
});