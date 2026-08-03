import { describe, it, expect, vi } from 'vitest';

// api query/mutation routes talk to Sentry, Better Stack and Upstash — all
// stubbed out so the handler contract is testable without infra or a DB.
vi.mock('@sentry/sveltekit', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));
vi.mock('$lib/server/log', () => ({
  logServerError: vi.fn(),
}));
vi.mock('$lib/server/ratelimit', () => ({
  checkRateLimit: vi.fn(async () => null),
}));
vi.mock('$lib/server/r2', () => ({
  getFile: vi.fn(),
  putFile: vi.fn(),
  deleteFile: vi.fn(),
  isR2Configured: vi.fn(() => false),
}));

import { POST as mutationPOST } from '@/routes/api/mutation/+server';
import { POST as queryPOST } from '@/routes/api/query/+server';

type RpcEvent = Parameters<typeof mutationPOST>[0];

const rpcEvent = (body: unknown): RpcEvent =>
  ({
    request: new Request('http://localhost/api/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    locals: { user: null, session: null } as App.Locals,
    getClientAddress: () => '127.0.0.1',
  }) as RpcEvent;

// Lock of the RPC wire contract (WL-012): validation failures are 400s returned
// as body JSON, and gated mutations reject with 401 before any DB access.
describe('api query/mutation route contract', () => {
  it('mutation: invalid envelope → 400 ValidationError body', async () => {
    const res = await mutationPOST(rpcEvent({}));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Validation failed' });
  });

  it('mutation: unauthenticated valid action → 401', async () => {
    await expect(
      mutationPOST(rpcEvent({ name: 'projects:createProject' })),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('query: invalid envelope → 400 ValidationError body', async () => {
    const res = await queryPOST(rpcEvent({}));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Validation failed' });
  });
});