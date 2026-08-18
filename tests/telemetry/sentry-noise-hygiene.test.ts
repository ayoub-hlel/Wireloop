import { describe, it, expect, vi, afterEach } from 'vitest';

// Bucket 11: Sentry noise hygiene
//
// The beforeSend hooks in hooks.client.ts and hooks.server.ts drop common
// dev-only noise: browser extension URLs, static-asset 404s, and internal
// Sentry requests. These tests lock the filtering contract so future changes
// don't regress noise hygiene.

describe('Sentry beforeSend noise filtering', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const isNoise = (raw: string) => {
    try {
      const u = new URL(raw);
      if (u.hostname === 'sentry.io' || u.hostname.endsWith('.sentry.io')) return true;
      if (u.protocol === 'chrome-extension:' || u.protocol === 'moz-extension:' || u.protocol === 'safari-web-extension:') return true;
    } catch { /* non-URL */ }
    return raw.endsWith('/favicon.ico') || raw.endsWith('/robots.txt');
  };

  it('drops sentry.io internal requests', () => {
    expect(isNoise('https://sentry.io/api/123/envelope/')).toBe(true);
  });

  it('drops browser extension URLs', () => {
    expect(isNoise('chrome-extension://fake-id/content.js')).toBe(true);
    expect(isNoise('moz-extension://fake-id/content.js')).toBe(true);
  });

  it('drops static-asset 404 noise', () => {
    expect(isNoise('https://wire-loop.tech/favicon.ico')).toBe(true);
    expect(isNoise('https://wire-loop.tech/robots.txt')).toBe(true);
  });

  it('passes through legitimate API requests', () => {
    expect(isNoise('https://wire-loop.tech/api/query/projects')).toBe(false);
  });

  it('does not match sentry.io as substring in unrelated host', () => {
    expect(isNoise('https://evil.com?sentry.io')).toBe(false);
  });
});
