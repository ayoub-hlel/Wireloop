import {sequence} from '@sveltejs/kit/hooks';
import { sentryHandle, handleErrorWithSentry, initCloudflareSentryHandle } from '@sentry/sveltekit';
import { getAuth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { setR2Binding } from '$lib/server/r2';
import { validateEnv } from '$lib/server/env';
import { logServerError } from '$lib/server/log';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { building, dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import * as Sentry from '@sentry/sveltekit';
import { SENTRY_RELEASE } from '$lib/telemetry/sentry';

if (!building) {
  validateEnv();
}

// ponytail: 100% sampling outside production, 10% in prod
const isProd = env.NODE_ENV === 'production';

export const handleError: HandleServerError = handleErrorWithSentry(async ({ error, event }) => {
  Sentry.captureException(error, {
    tags: { hook: 'handleError' },
    extra: { url: event.url.pathname, method: event.request.method },
  });
  logServerError(
    'unhandled server error',
    { error: String(error), url: event.url.pathname, method: event.request.method },
    event.platform?.ctx?.waitUntil?.bind(event.platform.ctx),
  );
  return {
    message: error instanceof Error ? error.message : String(error),
  };
});

export const handle: Handle = sequence(
  initCloudflareSentryHandle({
    dsn: env.PUBLIC_SENTRY_DSN,
    release: SENTRY_RELEASE,
    tracesSampleRate: isProd ? 0.1 : 1.0,
    enableLogs: true,
    environment: isProd ? 'production' : 'preview',
    debug: dev,
    beforeSend(event) {
      // Drop health check noise
      const url = event.request?.url ?? event.tags?.['url'] ?? '';
      if (typeof url === 'string' && (url.includes('/api/health') || url.includes('/api/diagnostics'))) {
        return null;
      }
      return event;
    },
  }),
  sentryHandle(),
  async ({ event, resolve }) => {
  // Wire Cloudflare R2 binding (avoids exposing access keys)
  if (!building && event.platform?.env?.R2) {
    setR2Binding(event.platform.env.R2);
  }

  // Populate session for all routes — auth is lazy, doesn't connect at import
  try {
    const auth = getAuth(event.url.origin);
    if (auth) {
      try {
        const session = await auth.api.getSession({
          headers: event.request.headers,
        });
        if (session) {
          event.locals.session = session.session;
          event.locals.user = session.user;
          // Attach user to Sentry for error correlation
          Sentry.setUser({
            id: session.user.id,
            email: session.user.email ?? undefined,
            username: session.user.name ?? undefined,
          });
        }
      } catch (e) {
        Sentry.captureException(e, { tags: { hook: 'session-check' } });
      }
      return svelteKitHandler({ event, resolve, auth, building });
    } else {
      // Auth factory unavailable (missing DATABASE_URL/BETTER_AUTH_SECRET or
      // init failure — captured in getAuth). Mark locals so route gates can
      // signal a config error instead of silently treating the user as logged
      // out (WL-002).
      event.locals.authError = 'auth-unavailable';
      logServerError('auth factory unavailable', { url: event.url.pathname });
    }
  } catch (e) {
    Sentry.captureException(e, { tags: { hook: 'auth-init' } });
  }

  event.locals.session ??= null;
  event.locals.user ??= null;
  return resolve(event);
});
