export const trace = {
  getTracer() {
    return {
      startActiveSpan(_name: string, ...rest: unknown[]) {
        const fn = rest[rest.length - 1] as (...args: unknown[]) => unknown;
        return fn({ end() {}, setAttribute() {}, setStatus() {}, recordException() {}, updateName() { return this } });
      },
    };
  },
  getActiveSpan() {},
};

export const SpanStatusCode = { UNSET: 0, OK: 1, ERROR: 2 };

export const context = {};

export const diag = { setLogger() {} };
