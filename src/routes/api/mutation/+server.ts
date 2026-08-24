import { json, error, isHttpError } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { projects, settings, profiles, projectFiles, starredProjects, organizations, orgMembers, sharedProjects, invites, notifications, auditLog } from '$lib/db/schema/projects';
import { user as userTable } from '$lib/db/schema/auth';
import { eq, and, sql, isNull } from 'drizzle-orm';
import { generateId } from 'better-auth';
import { putFile, deleteFile, isR2Configured } from '$lib/server/r2';
import { validate, ValidationError } from '$lib/server/validate';
import { actionEnvelope, project, user, organization, projectShare, invite as inviteSchema } from '$lib/server/validation';
import { checkRateLimit } from '$lib/server/ratelimit';
import { logServerError } from '$lib/server/log';
import { containerProjectNames, uniqueCopyName } from '$lib/server/project-names';
import { requireOrgRole, requireNotOwner, type OrgRole } from '$lib/server/authz';
import { sendInviteEmail } from '$lib/server/email';
import * as Sentry from '@sentry/sveltekit';

const mutationSchemas = {
  'projects:createProject': project.create,
  'projects:updateProject': project.update,
  'projects:deleteProject': project.delete,
  'projects:incrementProjectViews': project.incrementViews,
  'projects:saveProjectFile': project.saveFile,
  'projects:deleteProjectFile': project.deleteFile,
  'users:updateUserSettings': user.updateSettings,
  'users:updateTutorialProgress': user.updateTutorial,
  'users:updateUserProfile': user.updateProfile,
  'users:syncUserProfile': user.syncProfile,
  'projects:starProject': project.star,
  'projects:unstarProject': project.unstar,
  'projects:forkProject': project.fork,
  'projects:trashProject': project.trash,
  'projects:restoreProject': project.restore,
  'org:create': organization.create,
  'org:update': organization.update,
  'org:delete': organization.delete,
  'org:invite': organization.invite,
  'org:changeRole': organization.changeRole,
  'org:transferOwnership': organization.transferOwnership,
  'org:removeMember': organization.removeMember,
  'org:leave': organization.leave,
  'project:share': projectShare.share,
  'project:unshare': projectShare.unshare,
  'project:changeShareRole': projectShare.changeRole,
  'project:transferOwnership': projectShare.transferOwnership,
  'invite:accept': inviteSchema.accept,
  'invite:decline': inviteSchema.decline,
};

// RPC args arrive as an untyped envelope; per-action zod schemas validate them.
// This interface is the union of the schema outputs so switch arms can read
// fields without `any` (WL-012). Extended for Project Pages API (invites, sharing, lock).
type MutationArgs = {
  projectId: string;
  userId: string;
  name: string;
  description: string;
  workspace: string;
  boardType: 'uno' | 'nano' | 'mega';
  isPublic: boolean;
  tags: string[];
  content: string;
  filename: string;
  step: string;
  completed: boolean;
  username: string;
  profileImage: string;
  bio: string;
  location: string;
  website: string;
  email: string;
  slug: string;
  orgId: string;
  role: string;
  theme: 'light' | 'dark';
  language: string;
  autoSave: boolean;
  tutorialCompleted: Record<string, boolean>;
  newOwnerId: string;
  inviteId: string;
  notificationId: string;
  invitees: string[];
};

type Db = NonNullable<ReturnType<typeof getDb>>;

export async function POST({ request, locals, getClientAddress, platform }) {
  console.warn('[MUTATION] POST entry');
  const limited = await checkRateLimit('mutation', locals, getClientAddress);
  if (limited) {
    console.warn('[MUTATION] rate limited', { user: locals.user?.id });
    return limited;
  }
  try {
    const body = await request.json().catch(() => ({}));
    const { name, args } = validate(actionEnvelope, body);
    console.warn('[MUTATION] action envelope parsed', { name, user: locals.user?.id });
    if (!locals.user) throw error(401, 'Unauthorized');
    const db = getDb();
    if (!db) throw error(503, 'Database not available');

    const schema = mutationSchemas[name as keyof typeof mutationSchemas];
    const data = (schema ? validate<unknown>(schema, args) : args) as MutationArgs;
    const me = locals.user.id;

    switch (name) {
      // ── Projects ──
      case 'projects:createProject': {
        console.warn('[MUTATION] case:projects:createProject', { name: data.name, orgId: data.orgId, user: me });
        // ponytail: create is admin+ in orgs, always allowed in personal. Scope the dup check.
        const orgId = data.orgId as string | undefined;
        if (orgId) {
          await requireOrgRole(db, orgId, me, 'admin');
        }
        const scope = orgId ? { kind: 'org' as const, orgId } : { kind: 'personal' as const, userId: me };
        const taken = await containerProjectNames(db, scope);
        if (taken.has((data.name as string).toLowerCase())) {
          throw error(409, 'A project with this name already exists');
        }
        const id = generateId();
        const now = new Date();
        await db.insert(projects).values({
          id, userId: me, name: data.name, description: data.description,
          workspace: data.workspace, boardType: data.boardType, isPublic: orgId ? false : data.isPublic,
          tags: data.tags, likes: 0, views: 0, orgId: orgId ?? null, createdAt: now, updatedAt: now,
        });
        await db.insert(projectFiles).values({
          id: generateId(), projectId: id, userId: me, filename: `${id}.xml`,
          contentType: 'application/xml', size: (data.workspace as string)?.length ?? 0,
          checksum: simpleChecksum(data.workspace as string ?? ''), storageId: `inline:${id}`, uploadedAt: now,
        });
        // notify org members (admin+ can create → alert everyone)
        if (orgId) await notifyOrgMembers(db, orgId, me, 'org_project_created', { projectName: data.name as string });
        const projectRow = await db.select().from(projects).where(eq(projects.id, id)).then(r => r[0]);
        return json({ projectId: id, project: projectRow });
      }

      case 'projects:updateProject': {
        console.warn('[MUTATION] case:projects:updateProject', { projectId: data.projectId, user: me });
        const existing = await db.select().from(projects).where(eq(projects.id, data.projectId as string)).then(r => r[0]);
        if (!existing) throw error(404, 'Not found');
        await requireProjectWrite(db, existing, me);
        if (data.name) {
          const scope = existing.orgId ? { kind: 'org' as const, orgId: existing.orgId } : { kind: 'personal' as const, userId: me };
          const taken = await containerProjectNames(db, scope);
          // exclude self from dup check on rename
          if (taken.has((data.name as string).toLowerCase()) && (data.name as string).toLowerCase() !== existing.name.toLowerCase()) {
            throw error(409, 'A project with this name already exists');
          }
        }
        await db.update(projects).set({
          name: data.name ?? existing.name, description: data.description ?? existing.description,
          workspace: data.workspace ?? existing.workspace, boardType: data.boardType ?? existing.boardType,
          isPublic: data.isPublic ?? existing.isPublic, tags: data.tags ?? existing.tags, updatedAt: new Date(),
        }).where(eq(projects.id, data.projectId as string));
        const updated = await db.select().from(projects).where(eq(projects.id, data.projectId as string)).then(r => r[0]);
        return json(updated);
      }

      case 'projects:deleteProject': {
        console.warn('[MUTATION] case:projects:deleteProject', { projectId: data.projectId, user: me });
        const existing = await db.select().from(projects).where(eq(projects.id, data.projectId as string)).then(r => r[0]);
        if (!existing) throw error(404, 'Not found');
        await requireProjectWrite(db, existing, me);
        const fileRow = await db.select().from(projectFiles).where(eq(projectFiles.projectId, data.projectId as string)).then(r => r[0] ?? null);
        if (fileRow?.storageId.startsWith('r2:')) {
          await deleteFile(`projects/${data.projectId as string}.xml`).catch(e => console.error('R2 delete failed:', e));
        }
        await db.delete(projectFiles).where(eq(projectFiles.projectId, data.projectId as string));
        await db.delete(projects).where(eq(projects.id, data.projectId as string));
        await writeAudit(db, me, 'projects:deleteProject', 'project', data.projectId as string, { name: existing.name });
        return json({ success: true });
      }

      case 'projects:incrementProjectViews': {
        await db.update(projects).set({ views: sql`${projects.views} + 1` }).where(eq(projects.id, data.projectId as string));
        return json({ success: true });
      }

      case 'projects:saveProjectFile': {
        console.warn('[MUTATION] case:projects:saveProjectFile', { projectId: data.projectId, user: me });
        // Security: never trust client-supplied userId — always scope to the session user.
        const uid = me;
        // Security: the caller must have write access to the project — otherwise any
        // user could attach file rows to someone else's project.
        const target = await db.select().from(projects).where(eq(projects.id, data.projectId as string)).then(r => r[0]);
        if (!target) throw error(404, 'Not found');
        await requireProjectWrite(db, target, uid);
        const storageId = isR2Configured() ? `r2:${data.projectId as string}` : `inline:${data.projectId as string}`;
        if (isR2Configured() && data.content) {
          await putFile(`projects/${data.projectId as string}.xml`, data.content as string, 'application/xml').catch(e => console.error('R2 upload failed, falling back to inline:', e));
        }
        const existing = await db.select().from(projectFiles).where(and(eq(projectFiles.projectId, data.projectId as string), eq(projectFiles.userId, uid))).then(r => r[0] ?? null);
        if (existing) {
          await db.update(projectFiles).set({ size: (data.content as string).length, checksum: simpleChecksum(data.content as string), storageId, uploadedAt: new Date() }).where(eq(projectFiles.id, existing.id));
        } else {
          await db.insert(projectFiles).values({ id: generateId(), projectId: data.projectId as string, userId: uid, filename: `${data.projectId as string}.xml`, contentType: 'application/xml', size: (data.content as string).length, checksum: simpleChecksum(data.content as string), storageId, uploadedAt: new Date() });
        }
        return json({ success: true });
      }

      case 'projects:deleteProjectFile': {
        const existing = await db.select().from(projectFiles).where(eq(projectFiles.projectId, data.projectId as string)).then(r => r[0] ?? null);
        if (existing?.storageId.startsWith('r2:')) {
          await deleteFile(`projects/${data.projectId as string}.xml`).catch(e => console.error('R2 delete failed:', e));
        }
        await db.delete(projectFiles).where(eq(projectFiles.projectId, data.projectId as string));
        return json({ success: true });
      }

      case 'users:updateUserSettings': {
        const existing = await db.select().from(settings).where(eq(settings.userId, me)).then(r => r[0]);
        const updateData = { boardType: data.boardType ?? existing?.boardType ?? 'uno', theme: data.theme ?? existing?.theme ?? 'light', language: data.language ?? existing?.language ?? 'en', autoSave: data.autoSave ?? existing?.autoSave ?? true, tutorialCompleted: data.tutorialCompleted ?? existing?.tutorialCompleted ?? {}, updatedAt: new Date() };
        if (existing) await db.update(settings).set(updateData).where(eq(settings.userId, me));
        else await db.insert(settings).values({ userId: me, ...updateData });
        return json({ success: true });
      }

      case 'users:updateTutorialProgress': {
        const existing = await db.select().from(settings).where(eq(settings.userId, me)).then(r => r[0]);
        if (existing) {
          const tutorialCompleted = { ...(existing.tutorialCompleted as Record<string, boolean>), [data.step as string]: data.completed as boolean };
          await db.update(settings).set({ tutorialCompleted, updatedAt: new Date() }).where(eq(settings.userId, me));
        }
        return json({ success: true });
      }

      case 'users:updateUserProfile': {
        console.warn('[MUTATION] case:users:updateUserProfile', { user: me });
        const existing = await db.select().from(profiles).where(eq(profiles.userId, me)).then(r => r[0]);
        const updateData = { username: data.username ?? existing?.username, profileImage: data.profileImage ?? existing?.profileImage, bio: data.bio ?? existing?.bio, location: data.location ?? existing?.location, website: data.website ?? existing?.website, isPublic: data.isPublic ?? existing?.isPublic ?? false, updatedAt: new Date() };
        if (existing) await db.update(profiles).set(updateData).where(eq(profiles.userId, me));
        else await db.insert(profiles).values({ userId: me, email: locals.user.email ?? '', name: locals.user.name ?? '', ...updateData, lastLogin: new Date(), createdAt: new Date() });
        return json({ success: true });
      }

      case 'users:syncUserProfile': {
        const existing = await db.select().from(profiles).where(eq(profiles.userId, me)).then(r => r[0]);
        if (existing) {
          await db.update(profiles).set({ email: data.email ?? existing.email, name: data.name ?? existing.name, profileImage: data.profileImage ?? existing.profileImage, lastLogin: new Date(), updatedAt: new Date() }).where(eq(profiles.userId, me));
        } else {
          await db.insert(profiles).values({ userId: me, email: data.email ?? '', name: data.name ?? '', profileImage: data.profileImage, username: data.username, isPublic: false, lastLogin: new Date(), createdAt: new Date(), updatedAt: new Date() });
        }
        return json({ success: true, userId: me });
      }

      case 'projects:starProject': {
        await db.insert(starredProjects).values({ userId: me, projectId: data.projectId as string, createdAt: new Date() }).onConflictDoNothing();
        return json({ success: true });
      }

      case 'projects:unstarProject': {
        await db.delete(starredProjects).where(and(eq(starredProjects.userId, me), eq(starredProjects.projectId, data.projectId as string)));
        return json({ success: true });
      }

      case 'projects:forkProject': {
        console.warn('[MUTATION] case:projects:forkProject', { projectId: data.projectId, user: me });
        const source = await db.select().from(projects).where(eq(projects.id, data.projectId as string)).then(r => r[0]);
        if (!source) throw error(404, 'Not found');
        // Security: forking copies the full workspace — only allow it when the
        // caller can already see the source. 404 (not 403) so private-project
        // existence isn't leaked either.
        if (!source.isPublic && source.userId !== me) {
          let canSee = false;
          if (source.orgId) canSee = !!(await getOrgRole(db, source.orgId, me));
          if (!canSee) {
            const share = await db.select().from(sharedProjects).where(and(eq(sharedProjects.projectId, source.id), eq(sharedProjects.sharedWithUserId, me))).then(r => r[0]);
            canSee = !!share;
          }
          if (!canSee) throw error(404, 'Not found');
        }
        const taken = await containerProjectNames(db, { kind: 'personal', userId: me });
        const forkName = uniqueCopyName(source.name, taken);
        const id = generateId();
        const now = new Date();
        await db.insert(projects).values({ id, userId: me, name: forkName, description: source.description, workspace: source.workspace, boardType: source.boardType, isPublic: false, tags: source.tags, likes: 0, views: 0, orgId: null, thumbnailUrl: source.thumbnailUrl, forkedFrom: source.id, isForked: true, createdAt: now, updatedAt: now });
        const sourceFiles = await db.select().from(projectFiles).where(eq(projectFiles.projectId, source.id));
        for (const f of sourceFiles) {
          await db.insert(projectFiles).values({ id: generateId(), projectId: id, userId: me, filename: f.filename, contentType: f.contentType, size: f.size, checksum: f.checksum, storageId: f.storageId, uploadedAt: now });
        }
        return json({ success: true, projectId: id });
      }

      case 'projects:trashProject': {
        const row = await db.select().from(projects).where(eq(projects.id, data.projectId as string)).then(r => r[0]);
        if (!row) throw error(404, 'Not found');
        await requireProjectWrite(db, row, me);
        await db.update(projects).set({ deletedAt: new Date(), deletedBy: me }).where(eq(projects.id, data.projectId as string));
        if (row.orgId) await notifyOrgMembers(db, row.orgId, me, 'org_project_deleted', { projectName: row.name });
        await writeAudit(db, me, 'projects:trashProject', 'project', data.projectId as string);
        return json({ success: true });
      }

      case 'projects:restoreProject': {
        const row = await db.select().from(projects).where(eq(projects.id, data.projectId as string)).then(r => r[0]);
        if (!row) throw error(404, 'Not found');
        await requireProjectWrite(db, row, me);
        await db.update(projects).set({ deletedAt: null, deletedBy: null }).where(eq(projects.id, data.projectId as string));
        return json({ success: true });
      }

      // ── Organizations ──
      case 'org:create': {
        console.warn('[MUTATION] case:org:create', { name: data.name, user: me });
        const id = generateId();
        let slug = (data.slug as string) || slugify(data.name as string);
        const existingSlug = await db.select().from(organizations).where(eq(organizations.slug, slug)).then(r => r[0]);
        if (existingSlug) slug = slug + '-' + generateId().slice(0, 6);
        const now = new Date();
        await db.insert(organizations).values({ id, name: data.name, slug, description: data.description, ownerId: me, createdAt: now, updatedAt: now });
        await db.insert(orgMembers).values({ orgId: id, userId: me, role: 'owner', createdAt: now });
        // ponytail: batch-invite after creation. Each invitee gets a notification
        // (if registered) or email (if not) via the same dispatch as org:invite.
        const invitees = ((data.invitees as string[]) ?? []).map(e => e.toLowerCase().trim()).filter(Boolean);
        const uniqueInvitees = [...new Set(invitees)];
        for (const email of uniqueInvitees) {
          const inviteId = generateId();
          await db.insert(invites).values({ id: inviteId, kind: 'org', orgId: id, inviteeEmail: email, inviterId: me, role: 'user', status: 'pending' });
          await handleInviteNotification(db, inviteId, email, 'org', id, me);
        }
        return json({ success: true, orgId: id, invitesSent: uniqueInvitees.length });
      }

      case 'org:update': {
        await requireOrgRole(db, data.orgId as string, me, 'owner');
        const org = await db.select().from(organizations).where(eq(organizations.id, data.orgId as string)).then(r => r[0]);
        if (!org) throw error(404, 'Not found');
        await db.update(organizations).set({ name: data.name ?? org.name, slug: data.slug ?? org.slug, description: data.description ?? org.description, updatedAt: new Date() }).where(eq(organizations.id, data.orgId as string));
        return json({ success: true });
      }

      case 'org:delete': {
        await requireOrgRole(db, data.orgId as string, me, 'owner');
        await db.delete(organizations).where(eq(organizations.id, data.orgId as string));
        return json({ success: true });
      }

      case 'org:invite': {
        console.warn('[MUTATION] case:org:invite', { orgId: data.orgId, email: data.email, role: data.role, user: me });
        await requireOrgRole(db, data.orgId as string, me, 'admin');
        const email = (data.email as string).toLowerCase();
        const role = (data.role as string) || 'user';
        // ponytail: one pending invite per (org, email). Idempotent re-invite updates role.
        const existing = await db.select().from(invites).where(and(eq(invites.orgId, data.orgId as string), eq(invites.inviteeEmail, email), eq(invites.status, 'pending'))).then(r => r[0]);
        if (existing) {
          await db.update(invites).set({ role }).where(eq(invites.id, existing.id));
          return json({ success: true, inviteId: existing.id });
        }
        const id = generateId();
        await db.insert(invites).values({ id, kind: 'org', orgId: data.orgId as string, inviteeEmail: email, inviterId: me, role, status: 'pending' });
        // notify if registered; email if not
        await handleInviteNotification(db, id, email, 'org', data.orgId as string, me);
        return json({ success: true, inviteId: id });
      }

      case 'org:changeRole': {
        await requireOrgRole(db, data.orgId as string, me, 'admin');
        if (data.userId === me) throw error(400, 'Cannot change your own role');
        const target = await db.select().from(orgMembers).where(and(eq(orgMembers.orgId, data.orgId as string), eq(orgMembers.userId, data.userId as string))).then(r => r[0]);
        if (!target) throw error(404, 'Member not found');
        if (target.role === 'owner') throw error(403, 'Cannot change owner role');
        await db.update(orgMembers).set({ role: data.role as OrgRole }).where(and(eq(orgMembers.orgId, data.orgId as string), eq(orgMembers.userId, data.userId as string)));
        await writeAudit(db, me, 'org:changeRole', 'org', data.orgId as string, { targetUser: data.userId, newRole: data.role });
        return json({ success: true });
      }

      case 'org:transferOwnership': {
        console.warn('[MUTATION] case:org:transferOwnership', { orgId: data.orgId, newOwnerId: data.newOwnerId, user: me });
        await requireOrgRole(db, data.orgId as string, me, 'owner');
        const newOwner = data.newOwnerId as string;
        const member = await db.select().from(orgMembers).where(and(eq(orgMembers.orgId, data.orgId as string), eq(orgMembers.userId, newOwner))).then(r => r[0]);
        if (!member) throw error(400, 'Target must be an org member');
        await db.update(organizations).set({ ownerId: newOwner }).where(eq(organizations.id, data.orgId as string));
        await db.update(orgMembers).set({ role: 'owner' }).where(and(eq(orgMembers.orgId, data.orgId as string), eq(orgMembers.userId, newOwner)));
        await db.update(orgMembers).set({ role: 'admin' }).where(and(eq(orgMembers.orgId, data.orgId as string), eq(orgMembers.userId, me)));
        await db.insert(notifications).values({ id: generateId(), userId: newOwner, type: 'ownership_transferred', payload: { orgId: data.orgId as string }, createdAt: new Date() });
        await writeAudit(db, me, 'org:transferOwnership', 'org', data.orgId as string, { newOwner: newOwner });
        return json({ success: true });
      }

      case 'org:removeMember': {
        await requireOrgRole(db, data.orgId as string, me, 'admin');
        if (data.userId === me) throw error(400, 'Cannot remove yourself');
        const target = await db.select().from(orgMembers).where(and(eq(orgMembers.orgId, data.orgId as string), eq(orgMembers.userId, data.userId as string))).then(r => r[0]);
        if (!target) return json({ success: true });
        if (target.role === 'owner') throw error(403, 'Cannot remove owner');
        await db.delete(orgMembers).where(and(eq(orgMembers.orgId, data.orgId as string), eq(orgMembers.userId, data.userId as string)));
        await writeAudit(db, me, 'org:removeMember', 'org', data.orgId as string, { removedUser: data.userId });
        return json({ success: true });
      }

      case 'org:leave': {
        // Security/UX: leaving requires membership — previously a non-member got
        // a silent success. Owners still must transfer first (requireNotOwner).
        await requireOrgRole(db, data.orgId as string, me, 'viewer');
        await requireNotOwner(db, data.orgId as string, me);
        await db.delete(orgMembers).where(and(eq(orgMembers.orgId, data.orgId as string), eq(orgMembers.userId, me)));
        return json({ success: true });
      }

      // ── Personal-project sharing ──
      case 'project:share': {
        console.warn('[MUTATION] case:project:share', { projectId: data.projectId, email: data.email, role: data.role, user: me });
        const proj = await db.select().from(projects).where(eq(projects.id, data.projectId as string)).then(r => r[0]);
        if (!proj || proj.userId !== me) throw error(403, 'Only the owner can share');
        if (proj.orgId) throw error(400, 'Cannot share org projects');
        const email = (data.email as string).toLowerCase();
        const role = (data.role as string) || 'view';
        const existing = await db.select().from(invites).where(and(eq(invites.projectId, data.projectId as string), eq(invites.inviteeEmail, email), eq(invites.status, 'pending'))).then(r => r[0]);
        if (existing) { await db.update(invites).set({ role }).where(eq(invites.id, existing.id)); return json({ success: true, inviteId: existing.id }); }
        const id = generateId();
        await db.insert(invites).values({ id, kind: 'project', projectId: data.projectId as string, inviteeEmail: email, inviterId: me, role, status: 'pending' });
        await handleInviteNotification(db, id, email, 'project', data.projectId as string, me);
        return json({ success: true, inviteId: id });
      }

      case 'project:unshare': {
        const proj = await db.select().from(projects).where(eq(projects.id, data.projectId as string)).then(r => r[0]);
        if (!proj || proj.userId !== me) throw error(403, 'Only the owner can unshare');
        await db.delete(sharedProjects).where(and(eq(sharedProjects.projectId, data.projectId as string), eq(sharedProjects.sharedWithUserId, data.userId as string)));
        return json({ success: true });
      }

      case 'project:changeShareRole': {
        const proj = await db.select().from(projects).where(eq(projects.id, data.projectId as string)).then(r => r[0]);
        if (!proj || proj.userId !== me) throw error(403, 'Only the owner can change roles');
        await db.update(sharedProjects).set({ permission: data.role as 'view' | 'edit' }).where(and(eq(sharedProjects.projectId, data.projectId as string), eq(sharedProjects.sharedWithUserId, data.userId as string)));
        return json({ success: true });
      }

      case 'project:transferOwnership': {
        console.warn('[MUTATION] case:project:transferOwnership', { projectId: data.projectId, newOwnerId: data.newOwnerId, user: me });
        const proj = await db.select().from(projects).where(eq(projects.id, data.projectId as string)).then(r => r[0]);
        if (!proj || proj.userId !== me) throw error(403, 'Only the owner can transfer');
        const newOwner = data.newOwnerId as string;
        // new owner must be a current collaborator
        const collab = await db.select().from(sharedProjects).where(and(eq(sharedProjects.projectId, data.projectId as string), eq(sharedProjects.sharedWithUserId, newOwner))).then(r => r[0]);
        if (!collab) throw error(400, 'Target must be a collaborator');
        await db.update(projects).set({ userId: newOwner }).where(eq(projects.id, data.projectId as string));
        await db.update(sharedProjects).set({ sharedWithUserId: me, permission: 'edit' }).where(and(eq(sharedProjects.projectId, data.projectId as string), eq(sharedProjects.sharedWithUserId, newOwner)));
        await db.insert(notifications).values({ id: generateId(), userId: newOwner, type: 'ownership_transferred', payload: { projectId: data.projectId as string, projectName: proj.name }, createdAt: new Date() });
        await writeAudit(db, me, 'project:transferOwnership', 'project', data.projectId as string, { newOwner: newOwner });
        return json({ success: true });
      }

      // ── Invites ──
      case 'invite:accept': {
        const inv = await db.select().from(invites).where(eq(invites.id, data.inviteId as string)).then(r => r[0]);
        if (!inv || inv.status !== 'pending') throw error(404, 'Invite not found');
        // Security: only the invited email may accept — invite IDs are guessable-enough
        // tokens, and accepting someone else's invite would grant org/project access.
        if (inv.inviteeEmail && inv.inviteeEmail !== locals.user?.email?.toLowerCase()) {
          throw error(403, 'This invite was sent to a different email address');
        }
        if (inv.kind === 'org') {
          await db.insert(orgMembers).values({ orgId: inv.orgId!, userId: me, role: inv.role as OrgRole, createdAt: new Date() }).onConflictDoNothing();
        } else {
          await db.insert(sharedProjects).values({ projectId: inv.projectId!, sharedWithUserId: me, permission: inv.role as 'view' | 'edit', sharedByUserId: inv.inviterId, createdAt: new Date() }).onConflictDoNothing();
        }
        await db.update(invites).set({ status: 'accepted', inviteeId: me }).where(eq(invites.id, inv.id));
        return json({ success: true });
      }

      case 'invite:decline': {
        // Security: same scoping as accept — only the invited email may decline,
        // otherwise anyone with an invite id could kill someone else's invite.
        const inv = await db.select().from(invites).where(eq(invites.id, data.inviteId as string)).then(r => r[0]);
        if (!inv || inv.status !== 'pending') throw error(404, 'Invite not found');
        if ((inv.inviteeEmail ?? '').toLowerCase() !== locals.user?.email?.toLowerCase()) {
          throw error(403, 'This invite was sent to a different email address');
        }
        await db.update(invites).set({ status: 'declined' }).where(eq(invites.id, data.inviteId as string));
        return json({ success: true });
      }

      // ── Notifications ──
      case 'notification:markAllRead': {
        await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, me), isNull(notifications.readAt)));
        return json({ success: true });
      }

      case 'notification:markRead': {
        await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, data.notificationId as string), eq(notifications.userId, me)));
        return json({ success: true });
      }

      default:
        console.warn('[MUTATION] unknown mutation', { name });
        throw error(404, `Unknown mutation: ${name}`);
    }
  } catch (e) {
    if (e instanceof ValidationError) {
      console.warn('[MUTATION] validation failed', { issues: e.issues, user: locals.user?.id });
      return json({ error: 'Validation failed', issues: e.issues }, { status: 400 });
    }
    // Deliberate HTTP errors (401/403/404/503) are the contract, not failures —
    // rethrow as-is instead of relabelling them 500.
    if (isHttpError(e)) throw e;
    Sentry.captureException(e, { tags: { route: 'mutation' } });
    logServerError('api/mutation failed', { error: String(e), user: locals.user?.id }, platform?.ctx?.waitUntil);
    console.warn('[MUTATION] error', { error: String(e), user: locals.user?.id });
    const raw = e instanceof Error ? e.message : String(e);
    const msg = /illegal invocation|fetch failed/i.test(raw)
      ? 'Database temporarily unavailable'
      : raw;
    throw error(500, msg);
  }
}

// ── Helpers ──

// Append-only audit entry for sensitive mutations. Fire-and-forget is wrong here:
// the write must be part of the same committed state as the mutation itself.
// Never throws into the request path — a failed audit insert must not block UX,
// but it IS logged loudly.
async function writeAudit(
  db: Db,
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata?: Record<string, unknown>,
) {
  try {
    await db.insert(auditLog).values({
      id: generateId(), actorUserId: actorId, action,
      targetType, targetId, metadata: metadata ?? null, createdAt: new Date(),
    });
  } catch (e) {
    console.error('[AUDIT] write failed', { action, targetId, error: String(e) });
    Sentry.captureException(e, { tags: { route: 'audit' } });
  }
}

// ponytail: write access = owner (personal) or admin+ (org). One place, one rule.
async function requireProjectWrite(db: Db, project: typeof projects.$inferSelect, userId: string) {
  if (project.orgId) { await requireOrgRole(db, project.orgId, userId, 'admin'); return; }
  if (project.userId !== userId) {
    // personal project shared as editor
    const share = await db.select().from(sharedProjects).where(and(eq(sharedProjects.projectId, project.id), eq(sharedProjects.sharedWithUserId, userId))).then(r => r[0]);
    if (!share || share.permission !== 'edit') throw error(403, 'Forbidden');
  }
}

async function notifyOrgMembers(db: Db, orgId: string, actorId: string, type: 'org_project_created' | 'org_project_deleted', payload: Record<string, unknown>) {
  const members = await db.select().from(orgMembers).where(eq(orgMembers.orgId, orgId));
  const rows = members.filter(m => m.userId !== actorId).map(m => ({
    id: generateId(), userId: m.userId, type, payload, createdAt: new Date(),
  }));
  if (rows.length) await db.insert(notifications).values(rows);
}

// ponytail: if the invitee is registered → notification (they have the bell). If not → email.
// Email lives on the user table (Better Auth), not profiles.
async function handleInviteNotification(db: Db, inviteId: string, email: string, kind: 'org' | 'project', targetId: string, inviterId: string) {
  const inviter = await db.select().from(profiles).where(eq(profiles.userId, inviterId)).then(r => r[0]);
  const targetUser = await db.select().from(userTable).where(eq(userTable.email, email)).then(r => r[0]);
  const targetName = kind === 'org'
    ? await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, targetId)).then(r => r[0]?.name ?? 'an organization')
    : await db.select({ name: projects.name }).from(projects).where(eq(projects.id, targetId)).then(r => r[0]?.name ?? 'a project');
  if (targetUser) {
    await db.insert(notifications).values({ id: generateId(), userId: targetUser.id, type: 'invite_received', payload: { inviteId, kind, targetId, inviterName: inviter?.name ?? 'Someone' }, createdAt: new Date() });
  } else {
    await sendInviteEmail(email, kind, targetName, inviter?.name ?? 'Someone');
  }
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function simpleChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) { hash = ((hash << 5) - hash) + data.charCodeAt(i); hash |= 0; }
  return Math.abs(hash).toString(16);
}
