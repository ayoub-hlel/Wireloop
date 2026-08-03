import { env } from "$env/dynamic/private";

const REQUIRED_VARS = ["DATABASE_URL", "BETTER_AUTH_SECRET", "RESEND_API_KEY"] as const;
// ponytail: Upstash absent in dev = rate limiting disabled (see ratelimit.ts); prod must have it.
const REQUIRED_IN_PROD = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"] as const;

export function validateEnv(): void {
  const keys = env.NODE_ENV === "production" ? [...REQUIRED_VARS, ...REQUIRED_IN_PROD] : [...REQUIRED_VARS];
  const missing: string[] = [];
  for (const key of keys) {
    if (!env[key]) {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
  }
}
