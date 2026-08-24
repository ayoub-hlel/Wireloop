import { json } from '@sveltejs/kit';
import { Ratelimit } from '@upstash/ratelimit';
import { env } from '$env/dynamic/private';
import * as Sentry from '@sentry/sveltekit';
import { getUpstashRedis } from './upstash';

// ponytail: no Upstash env (local dev) → null limiters → limiting disabled, never 429s locally.
// Prod sets both vars (validateEnv hard-fails at boot).
const redis = getUpstashRedis();

// Per-kind prefix is REQUIRED: every Ratelimit instance defaults to the same
// "@upstash/ratelimit" prefix, so query/mutation/upload would share one Redis
// key per identifier and bleed into each other's budgets.
const make = (kind: string, requests: number) =>
  redis
    ? new Ratelimit({
        prefix: `wl:${kind}`,
        redis,
        limiter: Ratelimit.slidingWindow(requests, '10 s'),
      })
    : null;

export const limiters = {
  query: make('query', 60),
  mutation: make('mutation', 30),
  upload: make('upload', 5),
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
  if (!limiter) {
    console.warn('[RATELIMIT] no limiter for kind', { kind });
    return null;
  }

  const key = locals.user?.id ?? getClientAddress();
  console.warn('[RATELIMIT] checkRateLimit entry', { kind, key });

  // ponytail: Upstash REST can throw "Illegal invocation" or hang — fail open so a
  // broken limiter never takes down the API, but capture to Sentry so outages surface.
  const pass = { success: true as const, reset: 0 };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // Race against a 300ms budget — Upstash can take ~2s cross-region. The loser
    // of Promise.race must have its rejection pre-caught: a late REST failure on
    // the dangling promise would otherwise be an unhandledRejection and can kill
    // the Workers isolate after we already responded.
    const result = await Promise.race([
      limiter.limit(key).catch((e: unknown) => {
        Sentry.captureException(e, { tags: { component: 'ratelimit', action: 'fail-open', kind } });
        return pass;
      }),
      new Promise<{ success: true; reset: number }>(resolve => {
        timer = setTimeout(() => resolve(pass), 300);
      }),
    ]);
    clearTimeout(timer);

    if (result.success) {
      console.warn('[RATELIMIT] passed', { kind, key });
      return null;
    }

    const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
    console.warn('[RATELIMIT] rate limited', { kind, key, retryAfter });
    return json(
      { message: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  } catch (e) {
    clearTimeout(timer);
    Sentry.captureException(e, { tags: { component: 'ratelimit', action: 'fail-open', kind } });
    console.warn('[RATELIMIT] error — failing open', { kind, key, error: String(e) });
    return null; // ponytail: rate limiter broken → fail open, never block API
  }
}
