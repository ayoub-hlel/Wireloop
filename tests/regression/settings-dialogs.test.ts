import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { compile } from 'svelte/compiler';

// Regression: both dialogs shipped with `<Dialog.Root bind:open}>` (stray `}`),
// which broke `pnpm lint` (parse error) and `pnpm check` (bind_invalid_value + 3 ts errors).
const DIALOGS = [
  'src/lib/components/orgs/OrgSettingsDialog.svelte',
  'src/lib/components/projects/ProjectSettingsDialog.svelte',
];

describe('Settings dialogs — compile cleanly', () => {
  for (const path of DIALOGS) {
    const source = readFileSync(resolve(__dirname, '../..', path), 'utf8');

    it(`${path} compiles without errors or warnings that indicate broken markup`, () => {
      expect(() => compile(source, { filename: path, generate: 'client' })).not.toThrow();
    });

    it(`${path} binds open two-way (not a one-way prop or malformed attribute)`, () => {
      // `bind:open}` and `open={...}` both regress the dialog's ability to close itself.
      expect(source).toMatch(/<Dialog\.Root bind:open>/);
      expect(source).not.toMatch(/bind:open\}/);
    });

    it(`${path} declares open as a bindable prop`, () => {
      expect(source).toMatch(/let \{ open = \$bindable\(false\) \}/);
    });
  }
});
