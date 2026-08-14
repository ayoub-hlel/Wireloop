import { describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/sveltekit', () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));
vi.mock('$lib/server/log', () => ({ logServerError: vi.fn() }));
vi.mock('$lib/server/ratelimit', () => ({ checkRateLimit: vi.fn(async () => null) }));
vi.mock('$lib/server/r2', () => ({
  getFile: vi.fn(), putFile: vi.fn(), deleteFile: vi.fn(), isR2Configured: vi.fn(() => false),
}));
vi.mock('$lib/db', () => ({ getDb: () => null }));

import { POST as mutationPOST } from '@/routes/api/mutation/+server';
import { POST as queryPOST } from '@/routes/api/query/+server';

type RpcEvent = Parameters<typeof mutationPOST>[0];

const rpcEvent = (body: unknown, user: { id: string } | null = null): RpcEvent => ({
  request: new Request('http://localhost/api/rpc', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }),
  locals: { user, session: null } as unknown as App.Locals,
  getClientAddress: () => '127.0.0.1',
}) as RpcEvent;

describe('RPC route error contract', () => {
  it('returns validation failures as 400 JSON', async () => {
    const mutationResponse = await mutationPOST(rpcEvent({}));
    expect(mutationResponse.status).toBe(400);
    await expect(mutationResponse.json()).resolves.toMatchObject({ error: 'Validation failed' });
    const queryResponse = await queryPOST(rpcEvent({}));
    expect(queryResponse.status).toBe(400);
  });

  it('preserves deliberate 401 and 503 errors', async () => {
    await expect(mutationPOST(rpcEvent({ name: 'projects:createProject' })))
      .rejects.toMatchObject({ status: 401 });
    await expect(queryPOST(rpcEvent({ name: 'projects:list', args: { filter: 'projects' } })))
      .rejects.toMatchObject({ status: 503 });
    await expect(queryPOST(rpcEvent({ name: 'projects:list', args: { filter: 'projects' } }, { id: 'u1' })))
      .rejects.toMatchObject({ status: 503 });
  });
});
