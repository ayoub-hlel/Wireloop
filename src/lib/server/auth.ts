import { createAuth } from "./auth-factory";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { getRequestEvent } from "$app/server";

import { DATABASE_URL, BETTER_AUTH_SECRET } from "$env/static/private";
import { env } from "$env/dynamic/private";

let _auth: ReturnType<typeof createAuth> | null = null;

export function getAuth(baseURL?: string) {
  if (!_auth) {
    const url = DATABASE_URL;
    if (!url) return null;

    const base = baseURL || "http://localhost:5173";

    _auth = createAuth({
      databaseUrl: url,
      secret: BETTER_AUTH_SECRET,
      baseURL: base,
      allowedHosts: ["*.ngrok-free.dev"],
      extraPlugins: [sveltekitCookies(getRequestEvent)],
      socialProviders: {
        ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
          ? {
              github: {
                clientId: env.GITHUB_CLIENT_ID,
                clientSecret: env.GITHUB_CLIENT_SECRET,
              },
            }
          : {}),
        ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
          ? {
              google: {
                clientId: env.GOOGLE_CLIENT_ID,
                clientSecret: env.GOOGLE_CLIENT_SECRET,
              },
            }
          : {}),
      },
    });
  }
  return _auth;
}
