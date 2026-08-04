import { handleErrorWithSentry, replayIntegration } from "@sentry/sveltekit";
import * as Sentry from '@sentry/sveltekit';
import { env } from '$env/dynamic/public';
import { dev } from '$app/environment';
import { mark } from '$lib/telemetry/boot';
import { SENTRY_RELEASE } from '$lib/telemetry/sentry';

// ponytail: sample 100% outside production, 10% in prod — errors always keep full replay
const isProd = env.PUBLIC_APP_URL?.startsWith('https://wire-loop.tech') ?? false;

Sentry.init({
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
    const url = event.request?.url ?? '';
    if (typeof url === 'string') {
      // Drop Sentry's own internal requests
      if (url.includes('sentry.io')) return null;
      // Drop browser-extension noise (Chrome, Firefox, etc.)
      if (url.includes('extension://')) return null;
      // Drop common static-asset 404 noise in dev
      if (url.endsWith('/favicon.ico') || url.endsWith('/robots.txt')) return null;
    }
    return event;
  },
});

mark('hooks.client:sentry-ready');

export const handleError = handleErrorWithSentry();
