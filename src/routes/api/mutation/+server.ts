import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { projects, settings, profiles, projectFiles } from '$lib/db/schema/projects';
import { eq, and, sql } from 'drizzle-orm';
import { generateId } from 'better-auth';
import { putFile, deleteFile, isR2Configured } from '$lib/server/r2';

/**
 * Mutation endpoint — mirrors Convex mutation() interface.
 * POST  { name: 'projects:createProject', args: { ... } } → result
 */
export async function POST({ request, locals }) {
  const { name, args } = await request.json() as { name: string; args: any };
  if (!locals.user) throw error(401, 'Unauthorized');
  const db = getDb();

  switch (name) {
    // ── Projects ──
    case 'projects:createProject': {
      const id = generateId();
      const now = new Date();
      await db.insert(projects).values({
        id,
        userId: locals.user.id,
        name: args.name,
        description: args.description ?? '',
        workspace: args.workspace ?? '',
        boardType: args.boardType ?? 'uno',
        isPublic: args.isPublic ?? false,
        tags: args.tags ?? [],
        likes: 0,
        views: 0,
        createdAt: now,
        updatedAt: now,
      });
      // Auto-create project file entry
      await db.insert(projectFiles).values({
        id: generateId(),
        projectId: id,
        userId: locals.user.id,
        filename: `${id}.xml`,
        contentType: 'application/xml',
        size: (args.workspace ?? '').length,
        checksum: simpleChecksum(args.workspace ?? ''),
        storageId: `inline:${id}`,
        uploadedAt: now,
      });
      const project = await db.select().from(projects).where(eq(projects.id, id)).then(r => r[0]);
      return json({ projectId: id, project });
    }

    case 'projects:updateProject': {
      const projectId = args.id ?? args.projectId;
      if (!projectId) throw error(400, 'Missing projectId');
      const existing = await db.select().from(projects).where(eq(projects.id, projectId)).then(r => r[0]);
      if (!existing || existing.userId !== locals.user.id) throw error(404, 'Not found');
      await db.update(projects)
        .set({
          name: args.name ?? existing.name,
          description: args.description ?? existing.description,
          workspace: args.xml ?? args.workspace ?? existing.workspace,
          boardType: args.boardType ?? existing.boardType,
          isPublic: args.isPublic ?? existing.isPublic,
          tags: args.tags ?? existing.tags,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId));
      const updated = await db.select().from(projects).where(eq(projects.id, projectId)).then(r => r[0]);
      return json(updated);
    }

    case 'projects:deleteProject': {
      const projectId = args.id ?? args.projectId;
      if (!projectId) throw error(400, 'Missing projectId');
      const existing = await db.select().from(projects).where(eq(projects.id, projectId)).then(r => r[0]);
      if (!existing || existing.userId !== locals.user.id) throw error(404, 'Not found');
      const fileRow = await db.select().from(projectFiles).where(eq(projectFiles.projectId, projectId)).then(r => r[0] ?? null);
      if (fileRow?.storageId.startsWith('r2:')) {
        await deleteFile(`projects/${projectId}.xml`).catch(e => console.error('R2 delete failed:', e));
      }
      await db.delete(projectFiles).where(eq(projectFiles.projectId, projectId));
      await db.delete(projects).where(eq(projects.id, projectId));
      return json({ success: true });
    }

    case 'projects:incrementProjectViews': {
      const projectId = args.id ?? args.projectId;
      if (!projectId) return json({ success: false });
      await db.update(projects)
        .set({ views: sql`${projects.views} + 1` })
        .where(eq(projects.id, projectId));
      return json({ success: true });
    }

    case 'projects:saveProjectFile': {
      const projectId = args.projectId ?? args.id;
      if (!projectId) throw error(400, 'Missing projectId');
      const uid = args.userId ?? locals.user.id;
      const content = args.content ?? '';
      const storageId = isR2Configured() ? `r2:${projectId}` : `inline:${projectId}`;

      // Upload to R2 when configured
      if (isR2Configured() && content) {
        await putFile(`projects/${projectId}.xml`, content, 'application/xml').catch(e => {
          console.error('R2 upload failed, falling back to inline:', e);
        });
      }

      const existing = await db.select().from(projectFiles)
        .where(and(eq(projectFiles.projectId, projectId), eq(projectFiles.userId, uid)))
        .then(r => r[0] ?? null);
      if (existing) {
        await db.update(projectFiles).set({
          size: content.length,
          checksum: simpleChecksum(content),
          storageId,
          uploadedAt: new Date(),
        }).where(eq(projectFiles.id, existing.id));
      } else {
        await db.insert(projectFiles).values({
          id: generateId(),
          projectId,
          userId: uid,
          filename: args.filename ?? `${projectId}.xml`,
          contentType: 'application/xml',
          size: content.length,
          checksum: simpleChecksum(content),
          storageId,
          uploadedAt: new Date(),
        });
      }
      return json({ success: true });
    }

    case 'projects:deleteProjectFile': {
      const projectId = args.projectId ?? args.id;
      if (!projectId) throw error(400, 'Missing projectId');
      const existing = await db.select().from(projectFiles).where(eq(projectFiles.projectId, projectId)).then(r => r[0] ?? null);
      if (existing?.storageId.startsWith('r2:')) {
        await deleteFile(`projects/${projectId}.xml`).catch(e => console.error('R2 delete failed:', e));
      }
      await db.delete(projectFiles).where(eq(projectFiles.projectId, projectId));
      return json({ success: true });
    }

    // ── Settings ──
    case 'users:updateUserSettings': {
      const existing = await db.select().from(settings).where(eq(settings.userId, locals.user.id)).then(r => r[0]);
      const updateData = {
        boardType: args.boardType ?? existing?.boardType ?? 'uno',
        theme: args.theme ?? existing?.theme ?? 'light',
        language: args.language ?? existing?.language ?? 'en',
        autoSave: args.autoSave ?? existing?.autoSave ?? true,
        tutorialCompleted: args.tutorialCompleted ?? existing?.tutorialCompleted ?? {},
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
        const tutorialCompleted = { ...(existing.tutorialCompleted as Record<string, boolean>), [args.step]: args.completed };
        await db.update(settings).set({ tutorialCompleted, updatedAt: new Date() }).where(eq(settings.userId, locals.user.id));
      }
      return json({ success: true });
    }

    // ── Profile ──
    case 'users:updateUserProfile': {
      const existing = await db.select().from(profiles).where(eq(profiles.userId, locals.user.id)).then(r => r[0]);
      const updateData = {
        username: args.username ?? existing?.username,
        bio: args.bio ?? existing?.bio,
        location: args.location ?? existing?.location,
        website: args.website ?? existing?.website,
        isPublic: args.isPublic ?? existing?.isPublic ?? false,
        updatedAt: new Date(),
      };
      if (existing) {
        await db.update(profiles).set(updateData).where(eq(profiles.userId, locals.user.id));
      } else {
        await db.insert(profiles).values({
          userId: locals.user.id,
          email: locals.user.email ?? '',
          name: locals.user.name ?? '',
          profileImage: locals.user.image,
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
          email: args.email ?? existing.email,
          name: args.name ?? existing.name,
          profileImage: args.profileImage ?? existing.profileImage,
          lastLogin: new Date(),
          updatedAt: new Date(),
        }).where(eq(profiles.userId, locals.user.id));
      } else {
        await db.insert(profiles).values({
          userId: locals.user.id,
          email: args.email ?? '',
          name: args.name ?? '',
          profileImage: args.profileImage,
          username: args.username,
          isPublic: false,
          lastLogin: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      return json({ success: true, userId: locals.user.id });
    }

    default:
      throw error(404, `Unknown mutation: ${name}`);
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
