/**
 * Better Auth factory — pure config, no SvelteKit dependencies.
 *
 * Used by production auth.ts and by tests.
 */
import { betterAuth } from "better-auth";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import type { BetterAuthOptions } from "better-auth";
import * as schema from "../db/schema/auth";
import { sendVerificationEmail, sendPasswordResetEmail } from "./email";

export function validatePassword(pw: string): string[] {
  const errors: string[] = [];
  if (pw.length < 8) errors.push("Password must be at least 8 characters");
  if (!/[a-z]/.test(pw)) errors.push("Password must contain a lowercase letter");
  if (!/[A-Z]/.test(pw)) errors.push("Password must contain an uppercase letter");
  if (!/\d/.test(pw)) errors.push("Password must contain a number");
  if (!/[^A-Za-z0-9]/.test(pw)) errors.push("Password must contain a special character");
  return errors;
}

export type AuthFactoryDeps = {
  databaseUrl: string;
  secret: string;
  baseURL: string;
  /**
   * Additional Better Auth plugins (e.g. sveltekitCookies).
   */
  extraPlugins?: BetterAuthOptions["plugins"];
  /**
   * Additional allowed hosts for baseURL.
   */
  allowedHosts?: string[];
  /**
   * OAuth / social provider configs (GitHub, Google, etc.).
   */
  socialProviders?: BetterAuthOptions["socialProviders"];
  /**
   * Disable email verification requirement (for tests).
   */
  disableEmailVerification?: boolean;
};

export function createAuth(deps: AuthFactoryDeps) {
  const db = drizzle(neon(deps.databaseUrl), { schema });

  return betterAuth({
    database: drizzleAdapter(db, { provider: "pg", schema }),
    secret: deps.secret,
    basePath: "/api/auth",
    baseURL: {
      allowedHosts: [deps.baseURL, ...(deps.allowedHosts ?? [])],
      fallback: deps.baseURL,
    },

    // ── Email & password ─────────────────────────────────────────
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: !deps.disableEmailVerification,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      sendResetPassword: async ({ user, url }) => {
        void sendPasswordResetEmail({ email: user.email, url });
      },
    },

    // ── Email verification ────────────────────────────────────────
    ...(deps.disableEmailVerification
      ? {}
      : {
          emailVerification: {
            sendVerificationEmail: async ({ user, url }) => {
              void sendVerificationEmail({ email: user.email, url });
            },
            sendOnSignUp: true,
            autoSignInAfterVerification: true,
            expiresIn: 3600, // 1 hour
            callbackURL: "/onboarding",
          },
        }),

    // ── Social / OAuth providers ────────────────────────────────
    ...(deps.socialProviders ? { socialProviders: deps.socialProviders } : {}),

    // ── Password complexity hook ─────────────────────────────────
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/sign-up/email") {
          const password = ctx.body?.password;
          if (typeof password === "string") {
            const errors = validatePassword(password);
            if (errors.length > 0) {
              throw new APIError("UNPROCESSABLE_ENTITY", {
                message: errors.join(". "),
              });
            }
          }
        }
      }),
    },

    // ── Plugins ──────────────────────────────────────────────────
    plugins: deps.extraPlugins ?? [],
  } as BetterAuthOptions);
}
