/**
 * Email-verification enforcement, tested for real.
 *
 * The bypass report: request verification email → press sign in → let in.
 * Root cause: dev mode runs with NODE_ENV=development which sets
 * disableEmailVerification=true — sign-in legitimately skips the check there.
 * This suite pins the PRODUCTION contract: when verification is enabled
 * (the default), an unverified user must NOT get a session.
 *
 * Runs against pglite (real migrations) via the createAuth database seam —
 * no mocks on the auth path itself.
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/pglite';

vi.mock('$lib/server/email', () => ({
  // Verification emails are fire-and-forget in the factory (`void send...`);
  // a no-op keeps pglite tests hermetic without touching the auth path.
  sendVerificationEmail: vi.fn(async () => undefined),
  sendPasswordResetEmail: vi.fn(async () => undefined),
}));

import type { IntegrationDb } from '../helpers/db.helper';
let intDb: IntegrationDb;

import { createAuth } from '@/lib/server/auth-factory';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import * as schema from '@/lib/db/schema/auth';

const SECRET = 'test-secret-at-least-32-chars-long!!';

beforeAll(async () => {
  intDb = await (await import('./helpers/db.helper')).createIntegrationDb();
}, 60_000);

afterAll(async () => {
  await intDb?.close();
});

const makeAuth = () =>
  createAuth({
    databaseUrl: 'postgresql://unused@localhost/unused',
    secret: SECRET,
    baseURL: 'http://localhost:5173',
    // production default: verification REQUIRED
    disableEmailVerification: false,
    // test seam: real Better Auth against real migrated pglite
    database: drizzleAdapter(drizzle(intDb.client, { schema }), { provider: 'pg', schema }),
  });

describe('email verification gate', () => {
  const email = `verify-${Date.now()}@test.dev`;
  const password = 'Test1234!';

  it('sign-up succeeds but grants NO session when unverified', async () => {
    const res = await makeAuth().api.signUpEmail({
      body: { email, password, name: 'Verifier' },
      headers: new Headers(),
      asResponse: true,
    });
    expect(res.status).toBe(200);
    // No set-cookie session for unverified signups.
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).not.toContain('session_token');
  });

  it('rejects sign-in with 403 while the email is unverified', async () => {
    try {
      await makeAuth().api.signInEmail({
        body: { email, password },
        headers: new Headers(),
      });
      expect.fail('Expected EMAIL_NOT_VERIFIED rejection');
    } catch (e) {
      const err = e as { status?: number | string; statusCode?: number; body?: { status?: number | string; message?: string } };
      const status = String(err.status ?? err.statusCode ?? err.body?.status ?? '').toUpperCase();
      expect(status === '403' || status === 'FORBIDDEN').toBe(true);
    }
  });

  it('grants a session after the address is verified', async () => {
    const auth = makeAuth();
    // Flip what clicking the email link achieves.
    await intDb.client.exec(
      `UPDATE "user" SET email_verified = true WHERE email = '${email}'`,
    );
    const res = await auth.api.signInEmail({
      body: { email, password },
      headers: new Headers(),
      asResponse: true,
    });
    expect(res.status).toBe(200);
  });
});
