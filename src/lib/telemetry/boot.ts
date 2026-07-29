// Tiny boot telemetry helper. Sentry's captureConsoleIntegration already ships
// console lines, so this just provides a consistent prefix + an in-memory ring.
// ponytail: no framework, one file, zero deps.

const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
const marks: Array<{ name: string; t: number; data?: unknown }> = [];

if (typeof window !== 'undefined') {
  (window as any).__wl = marks;
}

export function mark(name: string, data?: unknown) {
  const t = typeof performance !== 'undefined' ? +(performance.now() - t0).toFixed(1) : 0;
  marks.push({ name, t, ...(data !== undefined ? { data } : {}) });
  // eslint-disable-next-line no-console
  console.log(`[wl] ${name} +${t}ms`, data ?? '');
}

export function fail(name: string, error: unknown) {
  const data =
    error instanceof Error
      ? { error: error.message, stack: error.stack }
      : { error: String(error) };
  mark(`FAIL:${name}`, data);
}
