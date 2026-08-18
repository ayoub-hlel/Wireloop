import { handleErrorWithSentry, replayIntegration } from "@sentry/sveltekit";
import * as Sentry from '@sentry/sveltekit';
import { env } from '$env/dynamic/public';
import { dev } from '$app/environment';
import { mark } from '$lib/telemetry/boot';
import { SENTRY_RELEASE } from '$lib/telemetry/sentry';

// ponytail: sample 100% outside production, 10% in prod — errors always keep full replay
const isProd = (() => {
  try { return new URL(env.PUBLIC_APP_URL ?? '').hostname === 'wire-loop.tech'; }
  catch { return false; }
})();

if (!dev) Sentry.init({
  dsn: env.PUBLIC_SENTRY_DSN,
  release: SENTRY_RELEASE,

  tracesSampleRate: isProd ? 0.1 : 1.0,
  environment: isProd ? 'production' : 'preview',
  debug: dev,

  replaysSessionSampleRate: isProd ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0,

  enableLogs: true,

  integrations: [
    replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
    Sentry.captureConsoleIntegration({
      levels: ['error'],
    }),
    // Capture HTTP failures (4xx, 5xx on API routes)
    Sentry.httpClientIntegration({
      failedRequestStatusCodes: [[400, 599]],
      failedRequestTargets: [/\/api\//],
    }),
    Sentry.feedbackIntegration({
      colorScheme: 'system',
    }),
  ],

  beforeSend(event) {
    const raw = event.request?.url ?? '';
    if (typeof raw === 'string') {
      try {
        const u = new URL(raw);
        if (u.hostname === 'sentry.io' || u.hostname.endsWith('.sentry.io')) return null;
        if (u.protocol === 'chrome-extension:' || u.protocol === 'moz-extension:' || u.protocol === 'safari-web-extension:') return null;
      } catch { /* non-URL, pass through */ }
      if (raw.endsWith('/favicon.ico') || raw.endsWith('/robots.txt')) return null;
    }
    return event;
  },
});

mark('hooks.client:sentry-ready');

export const handleError = handleErrorWithSentry();
