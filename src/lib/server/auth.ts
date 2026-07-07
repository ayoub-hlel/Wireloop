import { createAuth } from "./auth-factory";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { getRequestEvent } from "$app/server";

import { DATABASE_URL, BETTER_AUTH_SECRET } from "$env/static/private";

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
    });
  }
  return _auth;
}
