import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { logServerError } from '$lib/server/log';
// ponytail: constant monitoring - studio gate logs need waitUntil

export const load: LayoutServerLoad = async (event) => {
  console.warn('[STUDIO] layout entry', { pathname: event.url.pathname, hasSession: !!event.locals.session });
  if (!event.locals.session) {
    if (event.locals.authError) {
      // Distinguish "auth factory unavailable" (config/env error) from a plain
      // logged-out user: surface the reason instead of a silent 302 (WL-002).
      logServerError('studio gate: auth unavailable', {
        reason: event.locals.authError,
        url: event.url.pathname,
      }, event.platform?.ctx?.waitUntil?.bind(event.platform.ctx));
      console.warn('[STUDIO] auth unavailable — redirecting to login', { reason: event.locals.authError });
      redirect(302, `/login?reason=${encodeURIComponent(event.locals.authError)}`);
    }
    console.warn('[STUDIO] no session — redirecting to login', { pathname: event.url.pathname });
    redirect(302, '/login');
  }
};
