import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  console.warn('[GUARD] home page entry', { pathname: event.url.pathname, hasSession: !!event.locals.session });
	if (event.locals.session) {
    console.warn('[GUARD] already logged in — redirecting to projects');
		redirect(302, '/projects');
	}
};
