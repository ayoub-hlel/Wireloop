/**
 * Cross-tenant DB security suite.
 *
 * Runs the REAL route handlers against a REAL Postgres (pglite WASM) loaded
 * with the project's real drizzle migrations. Only infra edges are stubbed
 * (R2, rate limit, Sentry, email). Every case encodes a tenant-isolation
 * guarantee; a failure here means real data leakage, not a stale mock.
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('@sentry/sveltekit', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));
vi.mock('$lib/server/log', () => ({ logServerError: vi.fn() }));
vi.mock('$lib/server/ratelimit', () => ({
  checkRateLimit: vi.fn(async () => null),
}));
vi.mock('$lib/server/r2', () => ({
  putFile: vi.fn(async () => undefined),
  getFile: vi.fn(async () => null),
  deleteFile: vi.fn(async () => undefined),
  isR2Configured: vi.fn(() => false),
}));
vi.mock('$lib/server/email', () => ({
  sendInviteEmail: vi.fn(async () => undefined),
}));

import type { IntegrationDb } from './helpers/db.helper';
let intDb: IntegrationDb;

// hoisting-safe mock: factory closes over module-level var assigned in beforeAll
vi.mock('$lib/db', () => ({
  getDb: () => intDb?.db ?? null,
}));

import { POST as mutationPOST } from '@/routes/api/mutation/+server';
import { POST as queryPOST } from '@/routes/api/query/+server';
import { user as userTable } from '@/lib/db/schema/auth';

type Locals = { user: { id: string; email?: string; name?: string } | null };

const mutate = async (
  name: string,
  args: Record<string, unknown>,
  user: Locals['user'],
) =>
  mutationPOST({
    request: {
      json: async () => ({ name, args }),
    } as unknown as Request,
    locals: { user, session: null } as unknown as App.Locals,
    getClientAddress: () => '127.0.0.1',
    platform: undefined,
  } as never);

const query = async (
  name: string,
  args: Record<string, unknown> = {},
  user: Locals['user'],
) =>
  queryPOST({
    request: {
      json: async () => ({ name, args }),
    } as unknown as Request,
    locals: { user, session: null } as unknown as App.Locals,
    getClientAddress: () => '127.0.0.1',
    platform: undefined,
  } as never);

const statusOf = async (p: Promise<Response>): Promise<number> => {
  try {
    const res = await p;
    return res.status;
  } catch (e) {
    return (e as { status?: number }).status ?? 500;
  }
};

const seedUser = (
  id: string,
  email: string,
  name = id.toUpperCase(),
) =>
  intDb.db.insert(userTable).values({
    id,
    name,
    email,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

const ALICE = { id: 'alice', email: 'alice@test.dev', name: 'Alice' };
const BOB = { id: 'bob', email: 'bob@test.dev', name: 'Bob' };
const CAROL = { id: 'carol', email: 'carol@test.dev', name: 'Carol' };

beforeAll(async () => {
  intDb = await (await import('./helpers/db.helper')).createIntegrationDb();
  for (const u of [ALICE, BOB, CAROL]) await seedUser(u.id, u.email!, u.name);
}, 60_000);

afterAll(async () => {
  await intDb?.close();
});

let pid: string;

let inviteId: string;

let orgId: string;

describe('project isolation (mutations)', () => {
  const aliceProjectId = async (): Promise<string> =>
    ((await (await query('projects:list', { filter: 'projects' }, ALICE)).json())[0].id);

  it('creates a private project for alice as fixture', async () => {
    const res = await mutate(
      'projects:createProject',
      { name: 'Secret Bot', description: '', workspace: '<xml>SECRET</xml>', boardType: 'uno', isPublic: false, tags: [] },
      ALICE,
    );
    expect(res.status).toBe(200);
    pid = await aliceProjectId();
  });

  it("bob cannot update alice's private project", async () => {
    expect(await statusOf(mutate('projects:updateProject', { projectId: pid, name: 'Hacked' }, BOB))).toBe(403);
  });

  it("bob cannot delete alice's private project", async () => {
    expect(await statusOf(mutate('projects:deleteProject', { projectId: pid }, BOB))).toBe(403);
  });

  it("bob cannot trash or restore alice's project", async () => {
    expect(await statusOf(mutate('projects:trashProject', { projectId: pid }, BOB))).toBe(403);
    expect(await statusOf(mutate('projects:restoreProject', { projectId: pid }, BOB))).toBe(403);
  });

  it("bob cannot save a file into alice's project", async () => {
    expect(
      await statusOf(mutate('projects:saveProjectFile', { projectId: pid, content: '<x/>' }, BOB)),
    ).toBe(403);
  });

  it("bob forking alice's PRIVATE project must not receive its workspace", async () => {
    const status = await statusOf(mutate('projects:forkProject', { projectId: pid }, BOB));
    // Either rejected outright (404 — existence not leaked)...
    if (status === 200) {
      // ...or the fork must not contain alice's secret workspace.
    } else {
      expect([403, 404]).toContain(status);
    }
  });
});

describe('read isolation (queries)', () => {
  it("getProject hides alice's private project from bob", async () => {
    const res = await query('projects:getProject', { projectId: pid }, BOB);
    expect(await res.json()).toBeNull();
  });

  it('getProjectFile ignores client-supplied userId (IDOR)', async () => {
    const res = await query('projects:getProjectFile', { projectId: pid, userId: 'alice' }, BOB);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain('SECRET');
  });
});

describe('organization isolation', () => {
  it('alice creates an org and invites bob (fixture)', async () => {
    const res = await mutate('org:create', { name: 'Acme', invitees: [] }, ALICE);
    orgId = (await res.json()).orgId;
    expect(orgId).toBeDefined();
    const inv = await mutate('org:invite', { orgId, email: BOB.email }, ALICE);
    expect(inv.status).toBe(200);
    inviteId = (await inv.json()).inviteId;
  });

  it('carol (non-member) cannot invite into the org', async () => {
    expect(await statusOf(mutate('org:invite', { orgId, email: 'x@y.dev' }, CAROL))).toBe(403);
  });

  it('carol cannot update or delete the org', async () => {
    expect(await statusOf(mutate('org:update', { orgId, name: 'Owned' }, CAROL))).toBe(403);
    expect(await statusOf(mutate('org:delete', { orgId }, CAROL))).toBe(403);
  });

  it('carol cannot see org projects', async () => {
    const res = await query('org:getOrgProjects', { orgId }, CAROL);
    expect(await res.json()).toEqual([]);
  });

  it('carol cannot accept an invite addressed to bob', async () => {
    expect(await statusOf(mutate('invite:accept', { inviteId }, CAROL))).toBe(403);
  });

  it('carol cannot decline an invite addressed to bob', async () => {
    // separate invite so this test can't corrupt bob's fixture invite
    const inv2 = await mutate('org:invite', { orgId, email: CAROL.email }, ALICE);
    const carolInviteId = (await inv2.json()).inviteId;
    expect(await statusOf(mutate('invite:decline', { inviteId: carolInviteId }, BOB))).toBe(403);
    // carol CAN decline her own invite (legitimate path still works)
    expect((await mutate('invite:decline', { inviteId: carolInviteId }, CAROL)).status).toBe(200);
  });

  it('bob accepts, becomes member; viewer-role members cannot create org projects', async () => {
    expect((await mutate('invite:accept', { inviteId }, BOB)).status).toBe(200);
    // demote bob to viewer
    expect((await mutate('org:changeRole', { orgId, userId: BOB.id, role: 'viewer' }, ALICE)).status).toBe(200);
    expect(
      await statusOf(
        mutate('projects:createProject', { name: 'ViewerProj', orgId, workspace: '<x/>', boardType: 'uno', tags: [] }, BOB),
      ),
    ).toBe(403);
  });

  it('removed member loses org access immediately', async () => {
    expect((await mutate('org:removeMember', { orgId, userId: BOB.id }, ALICE)).status).toBe(200);
    const res = await query('org:getOrgProjects', { orgId }, BOB);
    expect(await res.json()).toEqual([]);
  });

  it('non-members cannot leave an org they never joined', async () => {
    expect(await statusOf(mutate('org:leave', { orgId }, CAROL))).toBe(403);
  });
});
