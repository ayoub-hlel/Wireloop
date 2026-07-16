import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { projects, settings, profiles, projectFiles, starredProjects } from '$lib/db/schema/projects';
import { eq, and, sql } from 'drizzle-orm';
import { generateId } from 'better-auth';
import { putFile, deleteFile, isR2Configured } from '$lib/server/r2';
import { validate, ValidationError } from '$lib/server/validate';
import { actionEnvelope, project, user } from '$lib/server/validation';

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

      default:
        throw error(404, `Unknown mutation: ${name}`);
    }
  } catch (e) {
    if (e instanceof ValidationError) {
      return json({ error: 'Validation failed', issues: e.issues }, { status: 400 });
    }
    throw e;
  }
}

function simpleChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}
