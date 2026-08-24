import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ponytail: the first loadModule() pays the one-time @sentry/sveltekit init cost
// (~5s cold) — default 5s test timeout is too tight for that single test.
vi.setConfig({ testTimeout: 20_000 });

// Mock the Upstash modules before importing the limiter (it reads env at import time).
const limitMock = vi.fn();
const ratelimitCtorSpy = vi.fn();
vi.mock('@sentry/sveltekit', () => ({ captureException: vi.fn() }));
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: Object.assign(
    class {
      limit = limitMock;
      constructor(public opts: unknown) {
        ratelimitCtorSpy(opts);
      }
    },
    { slidingWindow: vi.fn(() => ({})) },
  ),
}));
vi.mock('@upstash/redis', () => ({
  Redis: class {
    constructor(public opts: unknown) {}
  },
}));

const ok = { success: true, limit: 30, remaining: 29, reset: Date.now() + 10_000, pending: Promise.resolve() };

const loadModule = async () => {
  vi.resetModules();
  return import('@/lib/server/ratelimit');
};

describe('checkRateLimit', () => {
  beforeEach(() => {
    limitMock.mockReset();
    ratelimitCtorSpy.mockClear();
    process.env.UPSTASH_REDIS_REST_URL = 'http://fake-redis';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';
  });

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('allows requests under the limit', async () => {
    limitMock.mockResolvedValue(ok);
    const { checkRateLimit } = await loadModule();
    const res = await checkRateLimit('mutation', { user: { id: 'u1' } }, () => '127.0.0.1');
    expect(res).toBeNull();
    expect(limitMock).toHaveBeenCalledWith('u1');
  });

  it('returns 429 + Retry-After when the window is exceeded', async () => {
    const reset = Date.now() + 7_000;
    limitMock.mockResolvedValue({ ...ok, success: false, remaining: 0, reset });
    const { checkRateLimit } = await loadModule();

    const res = await checkRateLimit('mutation', { user: { id: 'u1' } }, () => '127.0.0.1');
    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);
    const retryAfter = Number(res!.headers.get('Retry-After'));
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(7);
  });

  it('falls back to client IP when there is no user', async () => {
    limitMock.mockResolvedValue(ok);
    const { checkRateLimit } = await loadModule();
    await checkRateLimit('query', { user: null }, () => '10.0.0.9');
    expect(limitMock).toHaveBeenCalledWith('10.0.0.9');
  });

  it('is a no-op when Upstash env is missing (dev)', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const { checkRateLimit } = await loadModule();
    const res = await checkRateLimit('mutation', { user: { id: 'u1' } }, () => '127.0.0.1');
    expect(res).toBeNull();
    expect(limitMock).not.toHaveBeenCalled();
  });

  it('fails open when Upstash takes longer than the 300ms budget', async () => {
    // never-resolving promise: simulates a stalled Upstash REST call
    limitMock.mockReturnValue(new Promise(() => {}));
    const { checkRateLimit } = await loadModule();
    const t0 = Date.now();
    const res = await checkRateLimit('query', { user: { id: 'u1' } }, () => '127.0.0.1');
    const elapsed = Date.now() - t0;
    expect(res).toBeNull();
    expect(elapsed).toBeLessThan(600); // generous margin; the timeout is 300ms
  });

  it('gives each limiter kind its own Redis prefix', async () => {
    await loadModule();
    const prefixes = ratelimitCtorSpy.mock.calls.map(c => (c[0] as { prefix: string }).prefix);
    expect(prefixes).toContain('wl:query');
    expect(prefixes).toContain('wl:mutation');
    expect(prefixes).toContain('wl:upload');
    expect(new Set(prefixes).size).toBe(3);
  });

  it('survives a late rejection from a stalled Upstash call without an unhandled rejection', async () => {
    // Rejects AFTER the 300ms race timeout has already resolved the request —
    // the dangling loser must have its rejection pre-caught.
    limitMock.mockImplementation(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error('late boom')), 400)),
    );
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    try {
      const { checkRateLimit } = await loadModule();
      const res = await checkRateLimit('query', { user: { id: 'u1' } }, () => '127.0.0.1');
      expect(res).toBeNull();
      // let the late rejection fire while we're still watching
      await new Promise(r => setTimeout(r, 500));
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });
});
