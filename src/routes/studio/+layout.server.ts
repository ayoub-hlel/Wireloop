import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { logServerError } from '$lib/server/log';

export const load: LayoutServerLoad = async (event) => {
  if (!event.locals.session) {
    if (event.locals.authError) {
      // Distinguish "auth factory unavailable" (config/env error) from a plain
      // logged-out user: surface the reason instead of a silent 302 (WL-002).
      logServerError('studio gate: auth unavailable', {
        reason: event.locals.authError,
        url: event.url.pathname,
      });
      redirect(302, `/login?reason=${encodeURIComponent(event.locals.authError)}`);
    }
    // eslint-disable-next-line no-console
    console.warn('[wl] studio:redirect-to-login', {
      reason: 'no-session',
      url: event.url.pathname,
    });
    redirect(302, '/login');
  }
};
