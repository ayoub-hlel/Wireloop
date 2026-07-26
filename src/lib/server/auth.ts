import { createAuth } from "./auth-factory";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { getRequestEvent } from "$app/server";
import { env } from "$env/dynamic/private";
import * as Sentry from '@sentry/sveltekit';

let _auth: ReturnType<typeof createAuth> | null = null;

export function getAuth(baseURL?: string) {
  if (!_auth) {
    const url = env.DATABASE_URL;
    if (!url) return null;
    const secret = env.BETTER_AUTH_SECRET;
    if (!secret) return null;

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

    try {
      _auth = createAuth({
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
    } catch (e) {
      Sentry.captureException(e, { tags: { service: 'auth', action: 'create' } });
      return null;
    }
  }
  return _auth;
}
