import * as Sentry from '@sentry/sveltekit';

Sentry.init({
  dsn: 'https://f55ef0a612641830775820f46e4d45a0@o4511743013879808.ingest.de.sentry.io/4511743022530640',

  tracesSampleRate: 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Skip OpenTelemetry setup — not supported in Cloudflare Workers
  skipOpenTelemetrySetup: true,

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: import.meta.env.DEV,
});