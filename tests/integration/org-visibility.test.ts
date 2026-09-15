/**
 * Org/project-members visibility suite.
 *
 * Guards the fixes that made the access UI reachable and complete:
 *   - org:getUserOrgs returns OWNED orgs (owner has no org_members row)
 *   - org:getMembers includes the owner with role 'owner'
 *   - projects:getSharedMembers returns a personal project's collaborators
 *
 * Runs the REAL handlers against REAL Postgres (pglite) loaded with the real
 * migrations, mirroring tests/integration/cross-tenant.test.ts.
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

vi.mock('$lib/db', () => ({
  getDb: () => intDb?.db ?? null,
}));

import { POST as queryPOST } from '@/routes/api/query/+server';
import { POST as mutationPOST } from '@/routes/api/mutation/+server';
import { user as userTable } from '@/lib/db/schema/auth';
import { profiles, orgMembers, sharedProjects } from '@/lib/db/schema/projects';

type Locals = { user: { id: string; email?: string; name?: string } | null };

const mutate = async (name: string, args: Record<string, unknown>, user: Locals['user']) =>
  mutationPOST({
    request: { json: async () => ({ name, args }) } as unknown as Request,
    locals: { user, session: null } as unknown as App.Locals,
    getClientAddress: () => '127.0.0.1',
    platform: undefined,
  } as never);

const query = async (name: string, args: Record<string, unknown> = {}, user: Locals['user']) =>
  queryPOST({
    request: { json: async () => ({ name, args }) } as unknown as Request,
    locals: { user, session: null } as unknown as App.Locals,
    getClientAddress: () => '127.0.0.1',
    platform: undefined,
  } as never);

const seedUser = (id: string, email: string, name: string) =>
  Promise.all([
    intDb.db.insert(userTable).values({ id, name, email, createdAt: new Date(), updatedAt: new Date() }),
    intDb.db.insert(profiles).values({ userId: id, email, name }),
  ]);

const ALICE = { id: 'alice', email: 'alice@test.dev', name: 'Alice' };
const BOB = { id: 'bob', email: 'bob@test.dev', name: 'Bob' };
const CAROL = { id: 'carol', email: 'carol@test.dev', name: 'Carol' };
const DANA = { id: 'dana', email: 'dana@test.dev', name: 'Dana' };

beforeAll(async () => {
  intDb = await (await import('./helpers/db.helper')).createIntegrationDb();
  for (const u of [ALICE, BOB, CAROL, DANA]) await seedUser(u.id, u.email!, u.name);
}, 60_000);

afterAll(async () => {
  await intDb?.close();
});

describe('org:getUserOrgs — owned orgs are visible', () => {
  let acmeId: string;

  it('fixture: alice (owner) creates an org, bob joins as member and owns his own', async () => {
    const res = await mutate('org:create', { name: 'Acme', invitees: [] }, ALICE);
    acmeId = (await res.json()).orgId;
    expect(acmeId).toBeDefined();

    // bob is a member of Acme (direct row — invite/accept flow is covered elsewhere)
    await intDb.db.insert(orgMembers).values({ orgId: acmeId, userId: BOB.id, role: 'user' });
    // bob also owns a separate org, exercising the owned ∪ member union
    const bobs = await mutate('org:create', { name: 'BobsCo', invitees: [] }, BOB);
    expect((await bobs.json()).orgId).toBeDefined();
  });

  it('owner sees their org even without an org_members row', async () => {
    const orgs = (await (await query('org:getUserOrgs', {}, ALICE)).json()) as Array<{ id: string; name: string }>;
    expect(orgs.map(o => o.name)).toContain('Acme');
  });

  it('a user who is both a member of one org and owner of another sees both', async () => {
    const orgs = (await (await query('org:getUserOrgs', {}, BOB)).json()) as Array<{ id: string; name: string }>;
    const names = orgs.map(o => o.name);
    expect(names).toContain('Acme');
    expect(names).toContain('BobsCo');
  });

  it('a user with neither ownership nor membership sees none', async () => {
    const orgs = (await (await query('org:getUserOrgs', {}, DANA)).json()) as Array<{ id: string }>;
    expect(orgs).toEqual([]);
  });
});

describe('org:getMembers — owner is in the list, roles are correct', () => {
  let acmeId: string;

  beforeAll(async () => {
    const res = await mutate('org:create', { name: 'MembershipCo', invitees: [] }, ALICE);
    acmeId = (await res.json()).orgId;
    await intDb.db.insert(orgMembers).values({ orgId: acmeId, userId: BOB.id, role: 'admin' });
    await intDb.db.insert(orgMembers).values({ orgId: acmeId, userId: CAROL.id, role: 'viewer' });
  });

  it('returns the owner plus every member with correct roles', async () => {
    const rows = (await (await query('org:getMembers', { orgId: acmeId }, ALICE)).json()) as Array<{ userId: string; role: string }>;
    const byUser = new Map(rows.map(r => [r.userId, r.role]));
    expect(byUser.get(ALICE.id)).toBe('owner');
    expect(byUser.get(BOB.id)).toBe('admin');
    expect(byUser.get(CAROL.id)).toBe('viewer');
    expect(rows.length).toBe(3);
  });

  it('non-members get an empty list, not an error', async () => {
    const rows = (await (await query('org:getMembers', { orgId: acmeId }, DANA)).json()) as unknown[];
    expect(rows).toEqual([]);
  });
});

describe('projects:getSharedMembers — collaborators render', () => {
  it('owner sees an accepted share; non-owner sees none', async () => {
    const res = await mutate(
      'projects:createProject',
      { name: 'Shared Widget', description: '', workspace: '<xml/>', boardType: 'uno', isPublic: false, tags: [] },
      ALICE,
    );
    expect(res.status).toBe(200);
    const pid = ((await (await query('projects:list', { filter: 'projects' }, ALICE)).json())[0].id) as string;

    // A share is an invite until accepted; acceptance lands in shared_projects.
    // Seed the accepted state directly — that's what the settings UI renders.
    await intDb.db.insert(sharedProjects).values({
      projectId: pid,
      sharedWithUserId: CAROL.id,
      permission: 'view',
      sharedByUserId: ALICE.id,
    });

    const collabs = (await (await query('projects:getSharedMembers', { projectId: pid }, ALICE)).json()) as Array<{ userId: string; role: string; name: string; email: string }>;
    expect(collabs).toEqual([{ userId: CAROL.id, role: 'view', name: 'Carol', email: 'carol@test.dev' }]);

    // non-owner is denied the list
    const bobView = await (await query('projects:getSharedMembers', { projectId: pid }, BOB)).json();
    expect(bobView).toEqual([]);
  });

  it('org projects never expose a share list', async () => {
    const orgRes = await mutate('org:create', { name: 'ShareOrg', invitees: [] }, ALICE);
    const orgId = (await orgRes.json()).orgId as string;
    const projRes = await mutate(
      'projects:createProject',
      { name: 'Org Widget', orgId, workspace: '<xml/>', boardType: 'uno', tags: [] },
      ALICE,
    );
    expect(projRes.status).toBe(200);
    const orgProjId = ((await (await query('org:getOrgProjects', { orgId }, ALICE)).json())[0].id) as string;
    const collabs = await (await query('projects:getSharedMembers', { projectId: orgProjId }, ALICE)).json();
    expect(collabs).toEqual([]);
  });
});
