import { env } from '$env/dynamic/private';

// ponytail: raw fetch, no SDK — server errors mirrored to Better Stack.
// Absent token → no-op. Never awaited by the caller path (pass waitUntil on Cloudflare).
const token = env.BETTER_STACK_SOURCE_TOKEN;
const ENDPOINT = 'https://in.logs.betterstack.com/';

export function logServerError(
  message: string,
  context: Record<string, unknown> = {},
  waitUntil?: (p: Promise<unknown>) => void,
): void {
  if (!token) return;
  const p = fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      dt: new Date().toISOString(),
      level: 'error',
      message,
      nested: context,
    }),
  }).catch(() => {}); // logging must never break the app
  if (waitUntil) waitUntil(p);
}
