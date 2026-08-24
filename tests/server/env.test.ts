import { describe, it, expect, vi, beforeEach } from 'vitest';

const { env } = vi.hoisted(() => ({ env: {} as Record<string, string | undefined> }));
vi.mock('$env/dynamic/private', () => ({ env }));

import { validateEnv } from '@/lib/server/env';

// WL-017: a redis:// URL in UPSTASH_REDIS_REST_URL 500s every API route at runtime;
// validateEnv must flag it at boot instead.
describe('validateEnv (WL-017)', () => {
  beforeEach(() => {
    for (const k of Object.keys(env)) delete env[k];
    env.NODE_ENV = 'development';
    env.DATABASE_URL = 'x';
    env.BETTER_AUTH_SECRET = 'x';
    env.RESEND_API_KEY = 'x';
    vi.restoreAllMocks();
  });

  it('flags non-https UPSTASH_REDIS_REST_URL', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    env.UPSTASH_REDIS_REST_URL = 'redis://default:x@host.upstash.io:6379';
    validateEnv();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('https://'));
  });

  it('accepts an https REST URL', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    env.UPSTASH_REDIS_REST_URL = 'https://host.upstash.io';
    validateEnv();
    expect(spy).not.toHaveBeenCalled();
  });

  it('hard-fails in production when required vars are missing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    env.NODE_ENV = 'production';
    delete env.UPSTASH_REDIS_REST_URL;
    delete env.UPSTASH_REDIS_REST_TOKEN;
    expect(() => validateEnv()).toThrow(/UPSTASH_REDIS_REST_URL/);
  });

  it('stays warn-only in development when optional vars are missing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    env.NODE_ENV = 'development';
    delete env.UPSTASH_REDIS_REST_URL;
    expect(() => validateEnv()).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
  });
});
