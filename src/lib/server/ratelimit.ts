import { json } from '@sveltejs/kit';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from '$env/dynamic/private';

// ponytail: no Upstash env (local dev) → null limiters → limiting disabled, never 429s locally.
// Prod sets both vars (validateEnv flags them missing).
const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })
    : null;

const make = (requests: number) =>
  redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(requests, '10 s') }) : null;

export const limiters = {
  query: make(60),
  mutation: make(30),
  upload: make(5),
};

export type LimiterKind = keyof typeof limiters;

type RateLimitLocals = { user?: { id: string } | null };

/**
 * Returns a 429 Response (with Retry-After) when the caller is over the window, else null.
 * Usage: `const limited = await checkRateLimit('query', locals, getClientAddress); if (limited) return limited;`
 */
export async function checkRateLimit(
  kind: LimiterKind,
  locals: RateLimitLocals,
  getClientAddress: () => string,
): Promise<Response | null> {
  const limiter = limiters[kind];
  if (!limiter) return null;

  const key = locals.user?.id ?? getClientAddress();
  const { success, reset } = await limiter.limit(key);
  if (success) return null;

  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return json(
    { message: 'Too many requests' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  );
}
