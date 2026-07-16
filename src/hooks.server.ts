import {sequence} from '@sveltejs/kit/hooks';
import { sentryHandle, handleErrorWithSentry, initCloudflareSentryHandle } from '@sentry/sveltekit';
import { getAuth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { setR2Binding } from '$lib/server/r2';
import { validateEnv } from '$lib/server/env';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { building } from '$app/environment';

if (!building) {
  validateEnv();
}

const sentryDsn = 'https://f55ef0a612641830775820f46e4d45a0@o4511743013879808.ingest.de.sentry.io/4511743022530640';

export const handleError: HandleServerError = handleErrorWithSentry(async ({ error, event }) => {
  console.error('SvelteKit error:', error, 'URL:', event.url.pathname);
  return {
    message: error instanceof Error ? error.message : String(error),
  };
});

export const handle: Handle = sequence(
  initCloudflareSentryHandle({
    dsn: sentryDsn,
    tracesSampleRate: 1.0,
    enableLogs: true,
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
        }
      } catch (e) {
        console.error('Session check failed:', e);
      }
      return svelteKitHandler({ event, resolve, auth, building });
    }
  } catch (e) {
    console.error('Auth init failed:', e);
  }

  event.locals.session ??= null;
  event.locals.user ??= null;
  return resolve(event);
});