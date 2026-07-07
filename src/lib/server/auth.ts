import { createAuth } from "./auth-factory";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { getRequestEvent } from "$app/server";
import { env } from "$env/dynamic/private";

let _auth: ReturnType<typeof createAuth> | null = null;

export function getAuth(baseURL?: string) {
  if (!_auth) {
    const url = env.DATABASE_URL;
    if (!url) return null;
    const secret = env.BETTER_AUTH_SECRET;
    if (!secret) return null;

    const base = baseURL || "http://localhost:5173";

    _auth = createAuth({
      databaseUrl: url,
      secret,
      baseURL: base,
      allowedHosts: ["*.ngrok-free.dev"],
      extraPlugins: [sveltekitCookies(getRequestEvent)],
    });
  }
  return _auth;
}
