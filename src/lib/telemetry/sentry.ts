import * as Sentry from '@sentry/sveltekit';

// ponytail: static release so Sentry keeps sessions (fixes the live "Discarded
// session because of missing or non-string release" warning). Per-deploy git-SHA
// release + source-map upload is T45 (CI wiring).
export const SENTRY_RELEASE = 'wireloop';

// WL-011: emulator errors are captured with a scoped tag so they aren't mixed
// with generic errors. Called from <svelte:boundary onerror> around the
// Simulator in RightPanelTabs.
export function captureEmulatorError(error: unknown): void {
  Sentry.captureException(error, { tags: { area: 'emulator' } });
}
