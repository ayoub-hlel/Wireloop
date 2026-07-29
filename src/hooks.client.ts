import { handleErrorWithSentry, replayIntegration } from "@sentry/sveltekit";
import * as Sentry from '@sentry/sveltekit';
import { mark } from '$lib/telemetry/boot';

Sentry.init({
  dsn: 'https://f55ef0a612641830775820f46e4d45a0@o4511743013879808.ingest.de.sentry.io/4511743022530640',

  tracesSampleRate: 1.0,
  environment: 'preview',
  debug: true,

  // Preview: capture 100% of everything
  replaysSessionSampleRate: 1.0,
  replaysOnErrorSampleRate: 1.0,

  enableLogs: true,

  integrations: [
    replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
    // Every console.log/warn/error → Sentry event
    Sentry.captureConsoleIntegration({
      levels: ['log', 'warn', 'error', 'info', 'debug'],
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

  dataCollection: {
    // Preview: capture everything
  },

  beforeSend(event) {
    // Drop Sentry's own internal requests
    const url = event.request?.url ?? '';
    if (typeof url === 'string' && url.includes('sentry.io')) {
      return null;
    }
    return event;
  },
});

mark('hooks.client:sentry-ready');

export const handleError = handleErrorWithSentry();
