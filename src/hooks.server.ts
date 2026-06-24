import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { setR2Binding } from '$lib/server/r2';
import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';

export const handle: Handle = async ({ event, resolve }) => {
  // Wire Cloudflare R2 binding (avoids exposing access keys)
  if (!building && event.platform?.env?.R2) {
    setR2Binding(event.platform.env.R2);
  }

  // Populate session for all routes
  const session = await auth.api.getSession({
    headers: event.request.headers,
  });
  if (session) {
    event.locals.session = session.session;
    event.locals.user = session.user;
  } else {
    event.locals.session = null;
    event.locals.user = null;
  }

  return svelteKitHandler({ event, resolve, auth, building });
};
