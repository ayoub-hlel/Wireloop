import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
  console.warn('[GUARD] project-settings layout entry', { pathname: event.url.pathname, hasSession: !!event.locals.session });
  if (!event.locals.session) {
    console.warn('[GUARD] no session — redirecting to login');
    redirect(302, '/login');
  }
};
