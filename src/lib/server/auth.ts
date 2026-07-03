import { betterAuth } from "better-auth";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { getRequestEvent } from "$app/server";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/neon-http";
import { neon, neonConfig } from "@neondatabase/serverless";
import { dash } from "@better-auth/infra";
import * as schema from "../db/schema/auth";

// ponytail: lazy init — doesn't connect at import time so SvelteKit's
// postbuild analysis can run without DATABASE_URL in the build env
let _auth: ReturnType<typeof betterAuth> | null = null;

export function getAuth() {
  if (!_auth) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL not set');
    neonConfig.fetchConnectionCache = true;
    const db = drizzle(neon(url), { schema });
    _auth = betterAuth({
      database: drizzleAdapter(db, { provider: "pg", schema }),
      secret: process.env.BETTER_AUTH_SECRET,
      basePath: "/api/auth",
      baseURL: {
        allowedHosts: [
          process.env.PUBLIC_APP_URL || "http://localhost:5173",
          "*.ngrok-free.dev",
        ],
        fallback: process.env.PUBLIC_APP_URL || "http://localhost:5173",
      },
      emailAndPassword: { enabled: true },
      plugins: [sveltekitCookies(getRequestEvent), dash()],
    });
  }
  return _auth;
}
