import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import commonjs from "@rollup/plugin-commonjs";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), commonjs({ sourceMap: true }), sveltekit()],
  
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
    include: ['@clerk/clerk-js']
  },
  resolve: {
    extensions: ['.js', '.ts', '.svelte']
  },
  build: {
    target: 'esnext',
    sourcemap: true
  }
});