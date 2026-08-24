/**
 * Security headers applied to every server response.
 * _headers only covers Pages static assets — API/SSR responses from the Worker
 * get nothing without this.
 */
const BASE_HEADERS: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
};

const PERMISSIONS_POLICY = 'geolocation=(), microphone=(), camera=()';

// ponytail: prod-only CSP — Vite dev requires inline/eval and would break.
// Allows: Google Fonts (app.html), Sentry beacons, Better Stack log ingest,
// Upstash REST (server-side calls don't need connect-src but harmless), Neon,
// and websockets (SvelteKit HMR in preview / realtime).
const CSP_PROD = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' https://fonts.gstatic.com data:",
  "connect-src 'self' https://*.sentry.io https://in.logs.betterstack.com https://*.upstash.io https://*.neon.tech wss:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

/** Clone a response with security headers added (never mutates the original). */
export function withSecurityHeaders(response: Response, isProd: boolean): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(BASE_HEADERS)) headers.set(k, v);
  if (isProd) {
    headers.set('content-security-policy', CSP_PROD);
    headers.set('permissions-policy', PERMISSIONS_POLICY);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
