import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  console.warn('[GUARD] onboarding page entry', { pathname: event.url.pathname, hasSession: !!event.locals.session });
  if (!event.locals.session) {
    console.warn('[GUARD] no session — redirecting to login');
    redirect(302, '/login');
  }
};
