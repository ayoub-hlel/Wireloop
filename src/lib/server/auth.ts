import { createAuth } from "./auth-factory";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { getRequestEvent } from "$app/server";

import {
  DATABASE_URL,
  BETTER_AUTH_SECRET,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
} from "$env/static/private";
import { PUBLIC_APP_URL } from "$env/static/public";

let _auth: ReturnType<typeof createAuth> | null = null;

export function getAuth() {
  if (!_auth) {
    const url = DATABASE_URL;
    if (!url) return null;

    const base = PUBLIC_APP_URL || "http://localhost:5173";

    _auth = createAuth({
      databaseUrl: url,
      secret: BETTER_AUTH_SECRET,
      baseURL: base,
      allowedHosts: ["*.ngrok-free.dev"],
      extraPlugins: [sveltekitCookies(getRequestEvent)],
      socialProviders: {
        ...(GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET
          ? {
              github: {
                clientId: GITHUB_CLIENT_ID,
                clientSecret: GITHUB_CLIENT_SECRET,
              },
            }
          : {}),
        ...(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
          ? {
              google: {
                clientId: GOOGLE_CLIENT_ID,
                clientSecret: GOOGLE_CLIENT_SECRET,
              },
            }
          : {}),
      },
    });
  }
  return _auth;
}
