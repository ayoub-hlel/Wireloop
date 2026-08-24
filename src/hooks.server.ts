import {sequence} from '@sveltejs/kit/hooks';
import { sentryHandle, handleErrorWithSentry, initCloudflareSentryHandle } from '@sentry/sveltekit';
import { getAuth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { setR2Binding } from '$lib/server/r2';
import { validateEnv } from '$lib/server/env';
import { logServerError, logRequest } from '$lib/server/log';
import { withSecurityHeaders } from '$lib/server/security-headers';
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
      const url = event.request?.url ?? event.tags?.['url'] ?? '';
      if (typeof url === 'string') {
        // Drop health check + diagnostics noise
        if (url.includes('/api/health') || url.includes('/api/diagnostics')) return null;
        // Drop static-asset 404 noise (favicon, robots.txt)
        if (url.endsWith('/favicon.ico') || url.endsWith('/robots.txt')) return null;
      }
      return event;
    },
  }),
  sentryHandle(),
  async ({ event, resolve }) => {
  console.warn('[HOOKS] handle entry', { pathname: event.url.pathname, method: event.request.method });
  // Wire Cloudflare R2 binding (avoids exposing access keys)
  if (!building && event.platform?.env?.R2) {
    setR2Binding(event.platform.env.R2);
    console.warn('[HOOKS] R2 binding wired');
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
          console.warn('[HOOKS] session resolved', { userId: session.user.id, email: session.user.email });
          // Attach user to Sentry for error correlation
          Sentry.setUser({
            id: session.user.id,
            email: session.user.email ?? undefined,
            username: session.user.name ?? undefined,
          });
        }
      } catch (e) {
        Sentry.captureException(e, { tags: { hook: 'session-check' } });
        console.warn('[HOOKS] session-check error', { error: String(e) });
      }
      const start2 = Date.now();
      const res = await svelteKitHandler({ event, resolve, auth, building });
      const path2 = event.url.pathname;
      const isNoise2 = path2 === '/api/health' || path2 === '/api/diagnostics' || path2.endsWith('/favicon.ico') || path2.endsWith('/robots.txt');
      if (!isNoise2) {
        logRequest(
          {
            method: event.request.method,
            url: path2,
            status: res.status,
            duration_ms: Date.now() - start2,
            user: event.locals.user?.id ?? null,
          },
          event.platform?.ctx?.waitUntil?.bind(event.platform.ctx),
        );
      }
      return withSecurityHeaders(res, isProd);
    } else {
      console.warn('[HOOKS] no session found');
      // Auth factory unavailable (missing DATABASE_URL/BETTER_AUTH_SECRET or
      // init failure — captured in getAuth). Mark locals so route gates can
      // signal a config error instead of silently treating the user as logged
      // out (WL-002).
      event.locals.authError = 'auth-unavailable';
      logServerError('auth factory unavailable', { url: event.url.pathname }, event.platform?.ctx?.waitUntil?.bind(event.platform.ctx));
      console.warn('[HOOKS] auth factory unavailable — marked authError', { url: event.url.pathname });
    }
  } catch (e) {
    Sentry.captureException(e, { tags: { hook: 'auth-init' } });
    console.warn('[HOOKS] auth-init error', { error: String(e) });
  }

  event.locals.session ??= null;
  event.locals.user ??= null;
  // constant monitoring: log every request with timing
  const start = Date.now();
  const response = await resolve(event);
  const duration = Date.now() - start;
  // ponytail: skip health/static noise already filtered in Sentry beforeSend, keep same filter here to save ingest
  const path = event.url.pathname;
  const isNoise = path === '/api/health' || path === '/api/diagnostics' || path.endsWith('/favicon.ico') || path.endsWith('/robots.txt');
  if (!isNoise) {
    logRequest(
      {
        method: event.request.method,
        url: path,
        status: response.status,
        duration_ms: duration,
        user: event.locals.user?.id ?? null,
      },
      event.platform?.ctx?.waitUntil?.bind(event.platform.ctx),
    );
  }
  return withSecurityHeaders(response, isProd);
});
