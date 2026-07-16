import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  compilerOptions: {
    compatibility: {
      componentApi: 4
    }
  },

  kit: {
    adapter: adapter({
      fallback: "index.html"
    }),

    experimental: {
      tracing: {
        server: true,
      },

      instrumentation: {
        server: true,
      },
    },
  },
};

export default config;