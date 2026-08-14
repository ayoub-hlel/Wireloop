import { env } from "$env/dynamic/private";

const REQUIRED_VARS = ["DATABASE_URL", "BETTER_AUTH_SECRET", "RESEND_API_KEY"] as const;
// ponytail: Upstash absent in dev = rate limiting disabled (see ratelimit.ts); prod must have it.
const REQUIRED_IN_PROD = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"] as const;

export function validateEnv(): void {
  console.warn('[ENV] validateEnv entry');
  const keys = env.NODE_ENV === "production" ? [...REQUIRED_VARS, ...REQUIRED_IN_PROD] : [...REQUIRED_VARS];
  const missing: string[] = [];
  for (const key of keys) {
    if (!env[key]) {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
    console.warn('[ENV] missing required vars', { missing });
  }
  // ponytail: fail fast on redis:// URLs — Upstash REST client needs https:// (WL-017 class);
  // a bad value otherwise 500s every API route at first request instead of being flagged at boot.
  if (env.UPSTASH_REDIS_REST_URL && !env.UPSTASH_REDIS_REST_URL.startsWith("https://")) {
    console.error("UPSTASH_REDIS_REST_URL must start with https:// (Upstash REST URL, not redis://)");
    console.warn('[ENV] UPSTASH_REDIS_REST_URL invalid scheme — must be https://', { url: env.UPSTASH_REDIS_REST_URL });
  }
  console.warn('[ENV] validateEnv done', { missing: missing.length });
}
