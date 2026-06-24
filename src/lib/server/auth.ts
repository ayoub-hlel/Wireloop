import { betterAuth } from "better-auth";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { getRequestEvent } from "$app/server";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { dash } from "@better-auth/infra";
import * as schema from "../db/schema/auth";

const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), {
  schema,
});

export const auth = betterAuth({
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
