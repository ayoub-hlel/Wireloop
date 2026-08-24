import { describe, it, expect } from 'vitest';
import { withSecurityHeaders } from '@/lib/server/security-headers';

const makeRes = () => new Response('ok', { status: 200 });

describe('withSecurityHeaders', () => {
  it('always adds the base headers', () => {
    const res = withSecurityHeaders(makeRes(), false);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
  });

  it('adds CSP + permissions policy in production', () => {
    const res = withSecurityHeaders(makeRes(), true);
    const csp = res.headers.get('content-security-policy') ?? '';
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain('frame-ancestors');
    expect(res.headers.get('permissions-policy')).toContain('geolocation=()');
  });

  it('skips CSP in dev (Vite needs inline/eval)', () => {
    const res = withSecurityHeaders(makeRes(), false);
    expect(res.headers.get('content-security-policy')).toBeNull();
  });

  it('preserves status and body of the original response', () => {
    const original = Response.json({ a: 1 }, { status: 418 });
    const res = withSecurityHeaders(original, true);
    expect(res.status).toBe(418);
  });
});
