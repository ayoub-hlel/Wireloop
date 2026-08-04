import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import json from "@eslint/json";
import css from "@eslint/css";
import svelte from "eslint-plugin-svelte";
import svelteConfig from "./svelte.config.js";
import { defineConfig } from "eslint/config";

const SVELTE_FILES = ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"];

export default defineConfig(
  { ignores: [".svelte-kit/**", "graphify-out/**", "static/**", "dist/**", "build/**", "k6/**"] },
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: {...globals.browser, ...globals.node} } },
  tseslint.configs.recommended,
  { files: ["**/*.{ts,svelte.ts}", ...SVELTE_FILES], rules: { "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }] } },
  // ponytail: test mocks are duck-typed partials cast across interfaces — any is the
  // honest type. Upgrade path: typed mock factories per component if drift bites.
  { files: ["tests/**", "**/__tests__/**"], rules: { "@typescript-eslint/no-explicit-any": "off" } },
  ...svelte.configs.recommended.map((config) => ({ ...config, files: SVELTE_FILES })),
  { files: SVELTE_FILES, rules: { "svelte/no-navigation-without-resolve": "off" } },
  {
    files: SVELTE_FILES,
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: [".svelte"],
        parser: tseslint.parser,
        svelteConfig
      }
    }
  },
  { files: ["**/*.json"], plugins: { json }, language: "json/json", extends: ["json/recommended"] },
  { files: ["**/*.jsonc"], plugins: { json }, language: "json/jsonc", extends: ["json/recommended"] },
  { files: ["**/*.json5"], plugins: { json }, language: "json/json5", extends: ["json/recommended"] },
  { files: ["**/*.css"], plugins: { css }, language: "css/css", extends: ["css/recommended"] },
  { files: ["src/globals.css"], plugins: { css }, language: "css/css", rules: { "css/no-invalid-at-rules": "off", "css/no-important": "off", "css/use-baseline": "off" } },
);
