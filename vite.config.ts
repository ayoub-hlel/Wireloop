import { sentrySvelteKit } from "@sentry/sveltekit";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [sentrySvelteKit({
    org: "ws-consulting",
    project: "javascript-sveltekit",
    autoInstrument: {
      server: {
        experimental: {
          skipOpenTelemetrySetup: true,
        },
      },
    },
  }), tailwindcss(), sveltekit()],

  define: {
    // Prevent process references in client code
    global: 'globalThis',
  },

  server: {
    host: true, // listen on all interfaces so Tailscale can reach it
    allowedHosts: true,
    fs: { strict: false }

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
