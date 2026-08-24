import { env } from '$env/dynamic/private';

// ponytail: raw fetch, no SDK — constant monitoring to Better Stack.
// Token read per-call for Cloudflare per-request env (not frozen at import).
// Level: info=requests, warn, error. waitUntil keeps Workers alive.
const ENDPOINT = 'https://in.logs.betterstack.com/';

function send(
  level: 'info' | 'warn' | 'error',
  message: string,
  context: Record<string, unknown> = {},
  waitUntil?: (p: Promise<unknown>) => void,
): void {
  const token = env.BETTER_STACK_SOURCE_TOKEN;
  if (!token) return;
  const p = fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      dt: new Date().toISOString(),
      level,
      message,
      ...context,
    }),
  }).catch(() => {});
  if (waitUntil) waitUntil(p);
}

export function logServerError(
  message: string,
  context: Record<string, unknown> = {},
  waitUntil?: (p: Promise<unknown>) => void,
): void {
  send('error', message, { nested: context }, waitUntil);
}

export function logInfo(
  message: string,
  context: Record<string, unknown> = {},
  waitUntil?: (p: Promise<unknown>) => void,
): void {
  send('info', message, context, waitUntil);
}

export function logWarn(
  message: string,
  context: Record<string, unknown> = {},
  waitUntil?: (p: Promise<unknown>) => void,
): void {
  send('warn', message, context, waitUntil);
}

// constant monitoring: every request
export function logRequest(
  context: Record<string, unknown>,
  waitUntil?: (p: Promise<unknown>) => void,
): void {
  send('info', 'request', context, waitUntil);
}
