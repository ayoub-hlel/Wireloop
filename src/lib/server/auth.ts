import { createAuth } from "./auth-factory";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { getRequestEvent } from "$app/server";
import { env } from "$env/dynamic/private";
import * as Sentry from '@sentry/sveltekit';

export function getAuth(baseURL?: string) {
  console.warn('[AUTH] getAuth entry', { baseURL });
  const url = env.DATABASE_URL;
  if (!url) {
    Sentry.captureMessage('Auth factory unavailable: DATABASE_URL missing', { level: 'error', tags: { service: 'auth', action: 'create' } });
    console.warn('[AUTH] DATABASE_URL missing — auth unavailable');
    return null;
  }
  const secret = env.BETTER_AUTH_SECRET;
  if (!secret) {
    Sentry.captureMessage('Auth factory unavailable: BETTER_AUTH_SECRET missing', { level: 'error', tags: { service: 'auth', action: 'create' } });
    console.warn('[AUTH] BETTER_AUTH_SECRET missing — auth unavailable');
    return null;
  }

  const base = baseURL || "http://localhost:5173";

  const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    socialProviders.github = {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    };
  }
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    socialProviders.google = {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    };
  }
  console.warn('[AUTH] social providers resolved', { providers: Object.keys(socialProviders) });

  try {
    const auth = createAuth({
      databaseUrl: url,
      secret,
      baseURL: base,
      allowedHosts: [
        "https://wire-loop.tech",
        "https://www.wire-loop.tech",
        "https://*.pages.dev",
      ],
      socialProviders: Object.keys(socialProviders).length > 0 ? socialProviders : undefined,
      disableEmailVerification: env.NODE_ENV === 'development',
      extraPlugins: [sveltekitCookies(getRequestEvent)],
    });
    console.warn('[AUTH] auth instance created successfully');
    return auth;
  } catch (e) {
    Sentry.captureException(e, { tags: { service: 'auth', action: 'create' } });
    console.warn('[AUTH] createAuth threw', { error: String(e) });
    return null;
  }
}
