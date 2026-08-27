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
    },
    warningFilter: (warning) => {
      return warning.code !== 'css_unused_selector';
    }
  },

  kit: {
    adapter: adapter({
      fallback: "index.html"
    }),

    experimental: {
      instrumentation: {
        server: true,
      },
    },
  },
};

export default config;