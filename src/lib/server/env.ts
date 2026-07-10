import { env } from "$env/dynamic/private";

const REQUIRED_VARS = ["DATABASE_URL", "BETTER_AUTH_SECRET", "RESEND_API_KEY"] as const;

export function validateEnv(): void {
  const missing: string[] = [];
  for (const key of REQUIRED_VARS) {
    if (!env[key]) {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
  }
}
