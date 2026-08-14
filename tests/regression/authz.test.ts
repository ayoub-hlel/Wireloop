import { describe, expect, it } from 'vitest';
import { organizations } from '../../src/lib/db/schema/projects';
import { getOrgRole, requireOrgRole } from '../../src/lib/server/authz';

const dbFor = (org: { ownerId: string } | undefined, role?: string) => ({
  select: () => ({
    from: (table: unknown) => ({
      where: async () => table === organizations ? (org ? [org] : []) : (role ? [{ role }] : []),
    }),
  }),
}) as unknown as Parameters<typeof getOrgRole>[0];

describe('organization authorization', () => {
  it('resolves the owner separately from membership rows', async () => {
    expect(await getOrgRole(dbFor({ ownerId: 'owner' }, 'viewer'), 'org', 'owner')).toBe('owner');
    expect(await getOrgRole(dbFor({ ownerId: 'owner' }, 'admin'), 'org', 'admin-user')).toBe('admin');
    expect(await getOrgRole(dbFor({ ownerId: 'owner' }), 'org', 'outsider')).toBeNull();
  });

  it('enforces the minimum role on the production helper', async () => {
    await expect(requireOrgRole(dbFor({ ownerId: 'owner' }), 'org', 'outsider', 'viewer'))
      .rejects.toMatchObject({ status: 403 });
    await expect(requireOrgRole(dbFor({ ownerId: 'owner' }, 'user'), 'org', 'member', 'admin'))
      .rejects.toMatchObject({ status: 403 });
    await expect(requireOrgRole(dbFor({ ownerId: 'owner' }, 'admin'), 'org', 'member', 'admin'))
      .resolves.toBe('admin');
  });
});
