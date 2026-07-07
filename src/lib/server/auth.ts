import { betterAuth } from "better-auth";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { getRequestEvent } from "$app/server";
<<<<<<< Updated upstream
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/neon-http";
import { neon, neonConfig } from "@neondatabase/serverless";
import * as schema from "../db/schema/auth";
=======
import { createAuth } from "./auth-factory";
>>>>>>> Stashed changes

import {
  DATABASE_URL,
  BETTER_AUTH_SECRET,
} from "$env/static/private";
import { PUBLIC_APP_URL } from "$env/static/public";

neonConfig.fetchConnectionCache = true;

let _auth: ReturnType<typeof betterAuth> | null = null;

export function getAuth() {
  if (!_auth) {
    const url = DATABASE_URL;
    if (!url) return null;

    const base = PUBLIC_APP_URL || "http://localhost:5173";
    const db = drizzle(neon(url), { schema });

    _auth = betterAuth({
      database: drizzleAdapter(db, { provider: "pg", schema }),
      secret: BETTER_AUTH_SECRET,
<<<<<<< Updated upstream
      basePath: "/api/auth",
      baseURL: {
        allowedHosts: [base, "*.ngrok-free.dev"],
        fallback: base,
      },
      emailAndPassword: { enabled: true },
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
      plugins: [sveltekitCookies(getRequestEvent)],
    } as any);
=======
      baseURL: base,
      allowedHosts: ["*.ngrok-free.dev"],
      extraPlugins: [sveltekitCookies(getRequestEvent)],
    });
>>>>>>> Stashed changes
  }
  return _auth;
}
