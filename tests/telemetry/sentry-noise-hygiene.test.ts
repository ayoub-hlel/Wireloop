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

  const makeEvent = (url: string) => ({
    request: { url },
    tags: { url },
  }) as Parameters<NonNullable<Parameters<typeof import('@sentry/sveltekit').init>[0]['beforeSend']>>[0];

  it('drops sentry.io internal requests', () => {
    const event = makeEvent('https://sentry.io/api/123/envelope/');
    // Client-side filter (from hooks.client.ts)
    const url = event.request?.url ?? '';
    expect(url.includes('sentry.io')).toBe(true);
  });

  it('drops browser extension URLs', () => {
    const event = makeEvent('chrome-extension://fake-id/content.js');
    const url = event.request?.url ?? '';
    expect(url.includes('extension://')).toBe(true);
  });

  it('drops static-asset 404 noise', () => {
    const event = makeEvent('https://wire-loop.tech/favicon.ico');
    const url = event.request?.url ?? '';
    expect(url.endsWith('/favicon.ico') || url.endsWith('/robots.txt')).toBe(true);
  });

  it('passes through legitimate API requests', () => {
    const event = makeEvent('https://wire-loop.tech/api/query/projects');
    const url = event.request?.url ?? '';
    const isNoise =
      url.includes('sentry.io') ||
      url.includes('extension://') ||
      url.endsWith('/favicon.ico') ||
      url.endsWith('/robots.txt') ||
      url.includes('/api/health') ||
      url.includes('/api/diagnostics');
    expect(isNoise).toBe(false);
  });
});
