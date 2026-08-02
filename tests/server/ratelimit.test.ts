import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Upstash modules before importing the limiter (it reads env at import time).
const limitMock = vi.fn();
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: Object.assign(
    class {
      limit = limitMock;
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
});
