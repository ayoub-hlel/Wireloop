import { auth } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';

const AUTH_PREFIX = '/api/auth/';

export const handle: Handle = async ({ event, resolve }) => {
  // Let Better Auth handle its own API routes
  if (event.url.pathname.startsWith(AUTH_PREFIX)) {
    return auth.handler(event.request);
  }

  // Populate session for all other routes
  const session = await auth.api.getSession({
    headers: event.request.headers,
  });
  event.locals.user = session?.user ?? null;
  event.locals.session = session?.session ?? null;

  return resolve(event);
};
