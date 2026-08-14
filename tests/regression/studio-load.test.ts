import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

vi.mock('@sentry/sveltekit', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));
vi.mock('$lib/server/log', () => ({ logServerError: vi.fn() }));
vi.mock('$lib/server/ratelimit', () => ({ checkRateLimit: vi.fn(async () => null) }));
vi.mock('$lib/server/r2', () => ({
  getFile: vi.fn(),
  putFile: vi.fn(),
  deleteFile: vi.fn(),
  isR2Configured: vi.fn(() => false),
}));
// No DB in tests — the main vitest config's env mock proxies process.env, which
// would otherwise build a real Neon client and query the live database.
vi.mock('$lib/db', () => ({ getDb: () => null }));

import { POST as queryPOST } from '@/routes/api/query/+server';

const ROOT = resolve(__dirname, '../..');
type RpcEvent = Parameters<typeof queryPOST>[0];

const rpcEvent = (body: unknown, user: { id: string } | null = { id: 'u1' }): RpcEvent =>
  ({
    request: new Request('http://localhost/api/query', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    locals: { user, session: null } as unknown as App.Locals,
    getClientAddress: () => '127.0.0.1',
  }) as RpcEvent;

/**
 * Regression for the /studio 500s (Sentry JAVASCRIPT-SVELTEKIT-1N and -17).
 *
 * -1N traced to settings.store.ts -> api.client.ts calling `users:getUserSettings`,
 *     which had no case in the query route (fixed as PD-6).
 * -17 traced to dashboard `open()` -> `projects:trackRecentProject`, a mutation
 *     with no handler. That call has since been removed from open().
 *
 * Studio loads a project through exactly two queries. Both must stay registered:
 * an unregistered name 404s, and before the isHttpError passthrough fix that
 * surfaced to users as an opaque 500.
 */
describe('studio project-load queries are registered', () => {
  // Without a DB the 503 guard fires before the switch, so status alone can't
  // distinguish registered from unknown here. Assert registration against the
  // route source, and assert the request is never relabelled 500.
  const queryRoute = readFileSync(resolve(ROOT, 'src/routes/api/query/+server.ts'), 'utf8');

  for (const name of ['projects:getProject', 'projects:getProjectFile']) {
    it(`${name} has a case in the query route`, () => {
      expect(queryRoute).toContain(`case '${name}':`);
    });

    it(`${name} does not surface a 500`, async () => {
      await queryPOST(rpcEvent({ name, args: { projectId: 'p1' } })).catch(
        (e: { status?: number }) => {
          expect(e.status).not.toBe(500);
        },
      );
    });
  }
});

describe('studio does not call removed RPC actions', () => {
  const dashboard = readFileSync(
    resolve(ROOT, 'src/routes/(fullpage)/projects/dashboard.svelte.ts'),
    'utf8',
  );
  const studioLayout = readFileSync(resolve(ROOT, 'src/routes/studio/+layout.svelte'), 'utf8');

  it('open() no longer calls projects:trackRecentProject (no server handler exists)', () => {
    expect(dashboard).not.toContain('trackRecentProject');
  });

  it('no source file references trackRecentProject', () => {
    expect(studioLayout).not.toContain('trackRecentProject');
  });
});

/**
 * getProjectFile is called from the studio layout with a `userId` argument.
 * Its zod schema is `.strict()`, so an unexpected key would throw a validation
 * error and break project loading. Lock the call site against the schema.
 */
describe('studio getProjectFile args match its strict schema', () => {
  const validation = readFileSync(resolve(ROOT, 'src/lib/server/validation.ts'), 'utf8');

  it('the schema accepts the userId the studio layout sends', () => {
    const getFile = validation.slice(validation.indexOf('getFile:'));
    expect(getFile).toContain('projectId');
    expect(getFile.slice(0, getFile.indexOf('}'))).toContain('userId');
  });

  it('args are accepted by the real route (no 400 validation failure)', async () => {
    // With getDb mocked to null this reaches the 503 guard, which sits AFTER the
    // envelope parse but BEFORE per-action validation. A strict-schema rejection
    // would instead resolve with a 400 body.
    const res = await queryPOST(
      rpcEvent({ name: 'projects:getProjectFile', args: { projectId: 'p1', userId: 'u1' } }),
    ).then(
      (r) => ({ kind: 'resolved' as const, status: r.status }),
      (e: { status?: number }) => ({ kind: 'threw' as const, status: e.status }),
    );

    expect(res.kind).toBe('threw');
    expect(res.status).not.toBe(400);
    expect(res.status).not.toBe(500);
  });
});
