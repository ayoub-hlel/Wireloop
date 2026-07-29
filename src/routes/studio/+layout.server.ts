import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
  if (!event.locals.session) {
    // eslint-disable-next-line no-console
    console.warn('[wl] studio:redirect-to-login', {
      reason: 'no-session',
      url: event.url.pathname,
    });
    redirect(302, '/login');
  }
};
