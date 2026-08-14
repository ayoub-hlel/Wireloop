import { error } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { organizations, orgMembers } from '$lib/db/schema/projects';
import { and, eq } from 'drizzle-orm';

type Db = NonNullable<ReturnType<typeof getDb>>;

// ponytail: rank map is the entire authz system. viewer < user < admin < owner.
// requireOrgRole(userId, orgId, 'admin') → owner or admin passes, user/viewer 403.
export const ORG_ROLE_RANK: Record<string, number> = {
  viewer: 0,
  user: 1,
  admin: 2,
  owner: 3,
};

export type OrgRole = 'owner' | 'admin' | 'user' | 'viewer';

// ponytail: owner is stored on organizations.ownerId (not in org_members), so resolve
// it first, then fall back to the membership row. One query each, cached per-request by callers.
export async function getOrgRole(db: Db, orgId: string, userId: string): Promise<OrgRole | null> {
  console.warn('[AUTHZ] getOrgRole entry', { orgId, userId });
  const org = await db.select().from(organizations).where(eq(organizations.id, orgId)).then(r => r[0]);
  if (!org) {
    console.warn('[AUTHZ] getOrgRole — org not found', { orgId });
    return null;
  }
  if (org.ownerId === userId) {
    console.warn('[AUTHZ] getOrgRole — user is owner', { orgId, userId });
    return 'owner';
  }
  const member = await db.select().from(orgMembers).where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId))).then(r => r[0]);
  console.warn('[AUTHZ] getOrgRole result', { orgId, userId, role: (member?.role as OrgRole) ?? null });
  return (member?.role as OrgRole) ?? null;
}

export async function requireOrgRole(db: Db, orgId: string, userId: string, minRole: OrgRole): Promise<OrgRole> {
  console.warn('[AUTHZ] requireOrgRole entry', { orgId, userId, minRole });
  const role = await getOrgRole(db, orgId, userId);
  if (!role) {
    console.warn('[AUTHZ] requireOrgRole — not a member', { orgId, userId });
    throw error(403, 'Not a member of this organization');
  }
  if (ORG_ROLE_RANK[role] < ORG_ROLE_RANK[minRole]) {
    console.warn('[AUTHZ] requireOrgRole — insufficient role', { orgId, userId, role, minRole });
    throw error(403, 'Insufficient role');
  }
  console.warn('[AUTHZ] requireOrgRole passed', { orgId, userId, role });
  return role;
}

// ponytail: owner can't leave without transferring — enforced at mutation layer, not DB,
// because the transfer + leave are two steps that must be atomic only in UX terms.
export async function requireNotOwner(db: Db, orgId: string, userId: string): Promise<void> {
  const org = await db.select().from(organizations).where(eq(organizations.id, orgId)).then(r => r[0]);
  if (org?.ownerId === userId) throw error(409, 'Transfer ownership before leaving');
}


