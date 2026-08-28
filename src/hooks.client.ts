import { handleErrorWithSentry } from "@sentry/sveltekit";
import { env } from '$env/dynamic/public';
import { dev } from '$app/environment';
import { mark } from '$lib/telemetry/boot';

const isProd = (() => {
  try { return new URL(env.PUBLIC_APP_URL ?? '').hostname === 'wire-loop.tech'; }
  catch { return false; }
})();

if (!dev) {
  queueMicrotask(() => {
    import('@sentry/sveltekit').then((Sentry) => {
      import('$lib/telemetry/sentry').then(({ SENTRY_RELEASE }) => {
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
            Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
            Sentry.captureConsoleIntegration({ levels: ['error'] }),
            Sentry.httpClientIntegration({
              failedRequestStatusCodes: [[500, 599]],
              failedRequestTargets: [/\/api\//],
            }),
            Sentry.feedbackIntegration({ colorScheme: 'system' }),
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
      });
    });
  });
}

export const handleError = handleErrorWithSentry();
