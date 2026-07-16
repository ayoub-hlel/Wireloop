export const trace = {
  getTracer() {
    return {
      startActiveSpan(_name: string, ...rest: unknown[]) {
        const fn = rest[rest.length - 1] as (...args: unknown[]) => unknown;
        return fn({ end() {}, setAttribute() {}, setAttributes() {}, setStatus() {}, recordException() {}, updateName() { return this } });
      },
    };
  },
  getActiveSpan() {},
};

export const SpanStatusCode = { UNSET: 0, OK: 1, ERROR: 2 };

export const propagation = {
  extract(_carrier: unknown, _baggageHeaders?: unknown) { return {}; },
  inject(_carrier: unknown) {},
};

export const context = {
  active() { return {}; },
  with(_ctx: unknown, fn: () => unknown) { return fn(); },
  withValue(_ctx: unknown, _key: unknown, _value: unknown) { return {}; },
};

export const diag = { setLogger() {} };
