import { describe, it, expect, vi, afterEach } from 'vitest';

const { mockCaptureException } = vi.hoisted(() => ({ mockCaptureException: vi.fn() }));
vi.mock('@sentry/sveltekit', () => ({ captureException: mockCaptureException }));

import { captureEmulatorError, SENTRY_RELEASE } from '@/lib/telemetry/sentry';

// WL-011: emulator errors must be tagged area:emulator (scoped boundary), and a
// release must exist so Sentry keeps sessions instead of discarding them.
describe('sentry telemetry (WL-011)', () => {
  afterEach(() => {
    mockCaptureException.mockClear();
  });

  it('captureEmulatorError tags events with area:emulator', () => {
    const err = new Error('sim blew up');
    captureEmulatorError(err);
    expect(mockCaptureException).toHaveBeenCalledWith(err, { tags: { area: 'emulator' } });
  });

  it('release is a non-empty string (stops Discarded-session warning)', () => {
    expect(typeof SENTRY_RELEASE).toBe('string');
    expect(SENTRY_RELEASE.length).toBeGreaterThan(0);
  });
});
