import { describe, it, expect, afterEach } from 'vitest';

// Regression (check bucket 3): tsconfig dropped .svelte-kit/ambient.d.ts from
// `include`, so `$env/dynamic/private` (declared there) failed to resolve as
// "Cannot find module '$env/dynamic/private'" across 9 server/hooks/db files.
// Re-adding the ambient declaration fixed svelte-check. At runtime vitest
// resolves the module via tests/mocks/env/private.ts — assert that contract so
// a future mock/alias change can't silently break env access in tests.
describe('$env/dynamic/private resolves for tests', () => {
  const seen: string[] = [];
  afterEach(() => {
    for (const k of seen) delete process.env[k];
  });

  it('exposes private env vars through the module', async () => {
    const mod = await import('$env/dynamic/private');
    expect(mod).toHaveProperty('env');

    process.env.WL_TEST_PRIVATE_KEY = 'wired-up';
    seen.push('WL_TEST_PRIVATE_KEY');
    expect(mod.env.WL_TEST_PRIVATE_KEY).toBe('wired-up');
  });
});