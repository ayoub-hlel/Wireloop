import { Redis } from '@upstash/redis';
import { env } from '$env/dynamic/private';

let client: Redis | null | undefined;

/**
 * Shared memoized Upstash REST client; null when env is absent (local dev).
 * One instance per isolate for both rate limiting and auth secondary storage.
 */
export function getUpstashRedis(): Redis | null {
  client ??=
    env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
      ? new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })
      : null;
  return client;
}

export interface AuthSecondaryStorage {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
  increment: (key: string, ttl?: number) => Promise<number>;
}

/**
 * better-auth secondaryStorage backed by the same Upstash Redis.
 * `increment` gives better-auth an atomic INCR consume path (dist/api/rate-limiter:
 * secondary storages with increment use check-and-increment atomically), so auth
 * throttling is distributed across Workers isolates instead of per-isolate memory.
 * @upstash/redis auto-JSON-round-trips strings, which matches better-auth's own
 * JSON.stringify on set / safeJSONParse on get.
 */
export function getUpstashSecondaryStorage(): AuthSecondaryStorage | null {
  const redis = getUpstashRedis();
  if (!redis) return null;
  const k = (key: string) => `wl:auth:${key}`;
  return {
    get: async key => (await redis.get<string>(k(key))) ?? null,
    set: async (key, value, ttl) => {
      await (ttl ? redis.set(k(key), value, { ex: ttl }) : redis.set(k(key), value));
    },
    delete: async key => {
      await redis.del(k(key));
    },
    increment: async (key, ttl) => {
      const kk = k(key);
      const n = await redis.incr(kk);
      // expire only on first hit — resetting TTL every increment would let a
      // continuous attacker hold the throttle open forever.
      if (n === 1 && ttl) await redis.expire(kk, ttl);
      return n;
    },
  };
}
