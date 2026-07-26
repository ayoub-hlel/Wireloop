import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { projects, settings, profiles, projectFiles, starredProjects, recentProjects, organizations, orgMembers } from '$lib/db/schema/projects';
import { eq, and, sql } from 'drizzle-orm';
import { generateId } from 'better-auth';
import { putFile, deleteFile, isR2Configured } from '$lib/server/r2';
import { validate, ValidationError } from '$lib/server/validate';
import { actionEnvelope, project, user, organization } from '$lib/server/validation';
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
  'projects:trackRecentProject': project.trackRecent,
  'org:create': organization.create,
  'org:update': organization.update,
  'org:delete': organization.delete,
  'org:addMember': organization.addMember,
  'org:removeMember': organization.removeMember,
};

export async function POST({ request, locals }) {
  try {
    const body = await request.json().catch(() => ({}));
    const { name, args } = validate(actionEnvelope, body);
    if (!locals.user) throw error(401, 'Unauthorized');
    const db = getDb();
    if (!db) throw error(503, 'Database not available');

    const schema = mutationSchemas[name];
    const data: any = schema ? validate(schema, args) : args;

    switch (name) {
      case 'projects:createProject': {
        const id = generateId();
        const now = new Date();
        await db.insert(projects).values({
          id,
          userId: locals.user.id,
          name: data.name,
          description: data.description,
          workspace: data.workspace,
          boardType: data.boardType,
          isPublic: data.isPublic,
          tags: data.tags,
          likes: 0,
          views: 0,
          createdAt: now,
          updatedAt: now,
        });
        await db.insert(projectFiles).values({
          id: generateId(),
          projectId: id,
          userId: locals.user.id,
          filename: `${id}.xml`,
          contentType: 'application/xml',
          size: data.workspace.length,
          checksum: simpleChecksum(data.workspace),
          storageId: `inline:${id}`,
          uploadedAt: now,
        });
        const projectRow = await db.select().from(projects).where(eq(projects.id, id)).then(r => r[0]);
        return json({ projectId: id, project: projectRow });
      }

      case 'projects:updateProject': {
        const existing = await db.select().from(projects).where(eq(projects.id, data.projectId)).then(r => r[0]);
        if (!existing || existing.userId !== locals.user.id) throw error(404, 'Not found');
        await db.update(projects)
          .set({
            name: data.name ?? existing.name,
            description: data.description ?? existing.description,
            workspace: data.workspace ?? existing.workspace,
            boardType: data.boardType ?? existing.boardType,
            isPublic: data.isPublic ?? existing.isPublic,
            tags: data.tags ?? existing.tags,
            updatedAt: new Date(),
          })
          .where(eq(projects.id, data.projectId));
        const updated = await db.select().from(projects).where(eq(projects.id, data.projectId)).then(r => r[0]);
        return json(updated);
      }

      case 'projects:deleteProject': {
        const existing = await db.select().from(projects).where(eq(projects.id, data.projectId)).then(r => r[0]);
        if (!existing || existing.userId !== locals.user.id) throw error(404, 'Not found');
        const fileRow = await db.select().from(projectFiles).where(eq(projectFiles.projectId, data.projectId)).then(r => r[0] ?? null);
        if (fileRow?.storageId.startsWith('r2:')) {
          await deleteFile(`projects/${data.projectId}.xml`).catch(e => console.error('R2 delete failed:', e));
        }
        await db.delete(projectFiles).where(eq(projectFiles.projectId, data.projectId));
        await db.delete(projects).where(eq(projects.id, data.projectId));
        return json({ success: true });
      }

      case 'projects:incrementProjectViews': {
        await db.update(projects)
          .set({ views: sql`${projects.views} + 1` })
          .where(eq(projects.id, data.projectId));
        return json({ success: true });
      }

      case 'projects:saveProjectFile': {
        const uid = data.userId ?? locals.user.id;
        const storageId = isR2Configured() ? `r2:${data.projectId}` : `inline:${data.projectId}`;

        if (isR2Configured() && data.content) {
          await putFile(`projects/${data.projectId}.xml`, data.content, 'application/xml').catch(e => {
            console.error('R2 upload failed, falling back to inline:', e);
          });
        }

        const existing = await db.select().from(projectFiles)
          .where(and(eq(projectFiles.projectId, data.projectId), eq(projectFiles.userId, uid)))
          .then(r => r[0] ?? null);
        if (existing) {
          await db.update(projectFiles).set({
            size: data.content.length,
            checksum: simpleChecksum(data.content),
            storageId,
            uploadedAt: new Date(),
          }).where(eq(projectFiles.id, existing.id));
        } else {
          await db.insert(projectFiles).values({
            id: generateId(),
            projectId: data.projectId,
            userId: uid,
            filename: data.filename ?? `${data.projectId}.xml`,
            contentType: 'application/xml',
            size: data.content.length,
            checksum: simpleChecksum(data.content),
            storageId,
            uploadedAt: new Date(),
          });
        }
        return json({ success: true });
      }

      case 'projects:deleteProjectFile': {
        const existing = await db.select().from(projectFiles).where(eq(projectFiles.projectId, data.projectId)).then(r => r[0] ?? null);
        if (existing?.storageId.startsWith('r2:')) {
          await deleteFile(`projects/${data.projectId}.xml`).catch(e => console.error('R2 delete failed:', e));
        }
        await db.delete(projectFiles).where(eq(projectFiles.projectId, data.projectId));
        return json({ success: true });
      }

      case 'users:updateUserSettings': {
        const existing = await db.select().from(settings).where(eq(settings.userId, locals.user.id)).then(r => r[0]);
        const updateData = {
          boardType: data.boardType ?? existing?.boardType ?? 'uno',
          theme: data.theme ?? existing?.theme ?? 'light',
          language: data.language ?? existing?.language ?? 'en',
          autoSave: data.autoSave ?? existing?.autoSave ?? true,
          tutorialCompleted: data.tutorialCompleted ?? existing?.tutorialCompleted ?? {},
          updatedAt: new Date(),
        };
        if (existing) {
          await db.update(settings).set(updateData).where(eq(settings.userId, locals.user.id));
        } else {
          await db.insert(settings).values({ userId: locals.user.id, ...updateData });
        }
        return json({ success: true });
      }

      case 'users:updateTutorialProgress': {
        const existing = await db.select().from(settings).where(eq(settings.userId, locals.user.id)).then(r => r[0]);
        if (existing) {
          const tutorialCompleted = { ...(existing.tutorialCompleted as Record<string, boolean>), [data.step]: data.completed };
          await db.update(settings).set({ tutorialCompleted, updatedAt: new Date() }).where(eq(settings.userId, locals.user.id));
        }
        return json({ success: true });
      }

      case 'users:updateUserProfile': {
        const existing = await db.select().from(profiles).where(eq(profiles.userId, locals.user.id)).then(r => r[0]);
        const updateData = {
          username: data.username ?? existing?.username,
          profileImage: data.profileImage ?? existing?.profileImage,
          bio: data.bio ?? existing?.bio,
          location: data.location ?? existing?.location,
          website: data.website ?? existing?.website,
          isPublic: data.isPublic ?? existing?.isPublic ?? false,
          updatedAt: new Date(),
        };
        if (existing) {
          await db.update(profiles).set(updateData).where(eq(profiles.userId, locals.user.id));
        } else {
          await db.insert(profiles).values({
            userId: locals.user.id,
            email: locals.user.email ?? '',
            name: locals.user.name ?? '',
            ...updateData,
            lastLogin: new Date(),
            createdAt: new Date(),
          });
        }
        return json({ success: true });
      }

      case 'users:syncUserProfile': {
        const existing = await db.select().from(profiles).where(eq(profiles.userId, locals.user.id)).then(r => r[0]);
        if (existing) {
          await db.update(profiles).set({
            email: data.email ?? existing.email,
            name: data.name ?? existing.name,
            profileImage: data.profileImage ?? existing.profileImage,
            lastLogin: new Date(),
            updatedAt: new Date(),
          }).where(eq(profiles.userId, locals.user.id));
        } else {
          await db.insert(profiles).values({
            userId: locals.user.id,
            email: data.email ?? '',
            name: data.name ?? '',
            profileImage: data.profileImage,
            username: data.username,
            isPublic: false,
            lastLogin: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
        return json({ success: true, userId: locals.user.id });
      }

      case 'projects:starProject': {
        await db.insert(starredProjects)
          .values({
            userId: locals.user.id,
            projectId: data.projectId,
            createdAt: new Date(),
          })
          .onConflictDoNothing();
        return json({ success: true });
      }

      case 'projects:unstarProject': {
        await db.delete(starredProjects)
          .where(
            and(
              eq(starredProjects.userId, locals.user.id),
              eq(starredProjects.projectId, data.projectId),
            ),
          );
        return json({ success: true });
      }

      case 'projects:forkProject': {
        const source = await db.select().from(projects).where(eq(projects.id, data.projectId)).then(r => r[0]);
        if (!source) throw error(404, 'Not found');
        const id = generateId();
        const now = new Date();
        await db.insert(projects).values({
          id,
          userId: locals.user.id,
          name: source.name,
          description: source.description,
          workspace: source.workspace,
          boardType: source.boardType,
          isPublic: false,
          tags: source.tags,
          likes: 0,
          views: 0,
          orgId: source.orgId,
          thumbnailUrl: source.thumbnailUrl,
          forkedFrom: source.id,
          createdAt: now,
          updatedAt: now,
        });
        const sourceFiles = await db.select().from(projectFiles).where(eq(projectFiles.projectId, source.id));
        for (const f of sourceFiles) {
          await db.insert(projectFiles).values({
            id: generateId(),
            projectId: id,
            userId: locals.user.id,
            filename: f.filename,
            contentType: f.contentType,
            size: f.size,
            checksum: f.checksum,
            storageId: f.storageId,
            uploadedAt: now,
          });
        }
        return json({ success: true, projectId: id });
      }

      case 'projects:trashProject': {
        const row = await db.select().from(projects).where(eq(projects.id, data.projectId)).then(r => r[0]);
        if (!row || row.userId !== locals.user.id) throw error(404, 'Not found');
        await db.update(projects).set({ deletedAt: new Date() }).where(eq(projects.id, data.projectId));
        return json({ success: true });
      }

      case 'projects:restoreProject': {
        const row = await db.select().from(projects).where(eq(projects.id, data.projectId)).then(r => r[0]);
        if (!row || row.userId !== locals.user.id) throw error(404, 'Not found');
        await db.update(projects).set({ deletedAt: null }).where(eq(projects.id, data.projectId));
        return json({ success: true });
      }

      case 'projects:trackRecentProject': {
        const now = new Date();
        await db.insert(recentProjects)
          .values({
            userId: locals.user.id,
            projectId: data.projectId,
            lastAccessedAt: now,
          })
          .onConflictDoUpdate({
            target: [recentProjects.userId, recentProjects.projectId],
            set: { lastAccessedAt: now },
          });
        return json({ success: true });
      }

      case 'org:create': {
        const id = generateId();
        let slug = data.slug || slugify(data.name);
        const existingSlug = await db.select().from(organizations).where(eq(organizations.slug, slug)).then(r => r[0]);
        if (existingSlug) {
          slug = slug + '-' + generateId().slice(0, 6);
        }
        const now = new Date();
        await db.insert(organizations).values({
          id, name: data.name, slug, description: data.description,
          ownerId: locals.user.id, createdAt: now, updatedAt: now,
        });
        await db.insert(orgMembers).values({
          orgId: id, userId: locals.user.id, role: 'owner', createdAt: now,
        });
        return json({ success: true, orgId: id });
      }

      case 'org:update': {
        const updateRole = await getOrgRole(db, data.orgId, locals.user.id);
        if (updateRole !== 'owner') throw error(403, 'Forbidden');
        const org = await db.select().from(organizations).where(eq(organizations.id, data.orgId)).then(r => r[0]);
        if (!org) throw error(404, 'Not found');
        await db.update(organizations)
          .set({
            name: data.name ?? org.name,
            slug: data.slug ?? org.slug,
            description: data.description ?? org.description,
            updatedAt: new Date(),
          })
          .where(eq(organizations.id, data.orgId));
        return json({ success: true });
      }

      case 'org:delete': {
        const deleteRole = await getOrgRole(db, data.orgId, locals.user.id);
        if (deleteRole !== 'owner') throw error(403, 'Forbidden');
        await db.delete(organizations).where(eq(organizations.id, data.orgId));
        return json({ success: true });
      }

      case 'org:addMember': {
        const addRole = await getOrgRole(db, data.orgId, locals.user.id);
        if (addRole !== 'owner' && addRole !== 'admin') throw error(403, 'Forbidden');
        await db.insert(orgMembers)
          .values({ orgId: data.orgId, userId: data.userId, role: data.role, createdAt: new Date() })
          .onConflictDoNothing({ target: [orgMembers.orgId, orgMembers.userId] });
        return json({ success: true });
      }

      case 'org:removeMember': {
        const removeRole = await getOrgRole(db, data.orgId, locals.user.id);
        if (removeRole !== 'owner' && removeRole !== 'admin') throw error(403, 'Forbidden');
        const target = await db.select().from(orgMembers).where(and(
          eq(orgMembers.orgId, data.orgId),
          eq(orgMembers.userId, data.userId),
        )).then(r => r[0]);
        if (!target) return json({ success: true });
        if (target.role === 'owner') throw error(403, 'Cannot remove owner');
        await db.delete(orgMembers).where(and(
          eq(orgMembers.orgId, data.orgId),
          eq(orgMembers.userId, data.userId),
        ));
        return json({ success: true });
      }

      default:
        throw error(404, `Unknown mutation: ${name}`);
    }
  } catch (e) {
    if (e instanceof ValidationError) {
      return json({ error: 'Validation failed', issues: e.issues }, { status: 400 });
    }
    Sentry.captureException(e, { tags: { route: 'mutation' } });
    throw e;
  }
}

async function getOrgRole(db: any, orgId: string, userId: string): Promise<'owner' | 'admin' | 'member' | null> {
  const org = await db.select().from(organizations).where(eq(organizations.id, orgId)).then(r => r[0]);
  if (!org) return null;
  if (org.ownerId === userId) return 'owner';
  const member = await db.select().from(orgMembers).where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId))).then(r => r[0]);
  return member?.role ?? null;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function simpleChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}
