import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { projects, settings, profiles, projectFiles } from '$lib/db/schema/projects';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getFile, isR2Configured } from '$lib/server/r2';

/**
 * Query endpoint — mirrors Convex query() interface.
 * POST  { name: 'projects:getProject', args: { id } } → data
 */
export async function POST({ request, locals }) {
  const { name, args } = await request.json();

  switch (name) {
    // ── Projects ──
    case 'projects:getUserProjects': {
      if (!locals.user) throw error(401, 'Unauthorized');
      const rows = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, locals.user.id))
        .orderBy(desc(projects.createdAt));
      return json(rows);
    }

    case 'projects:getProject': {
      const projectId = args.id ?? args.projectId;
      if (!projectId) return json(null);
      const row = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .then(r => r[0] ?? null);
      if (!row) return json(null);
      if (row.userId !== locals.user?.id && !row.isPublic) return json(null);
      return json(row);
    }

    case 'projects:getPublicProject': {
      const projectId = args.id ?? args.projectId;
      if (!projectId) return json(null);
      const row = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.isPublic, true)))
        .then(r => r[0] ?? null);
      return json(row);
    }

    case 'projects:getPublicProjects': {
      const limit = args.limit ?? 20;
      const rows = await db
        .select()
        .from(projects)
        .where(eq(projects.isPublic, true))
        .orderBy(desc(projects.createdAt))
        .limit(limit);
      return json(rows);
    }

    case 'projects:getProjectFile': {
      if (!locals.user) throw error(401, 'Unauthorized');
      const projectId = args.projectId ?? args.id;
      const uid = args.userId ?? locals.user.id;
      const row = await db
        .select()
        .from(projectFiles)
        .where(and(
          eq(projectFiles.projectId, projectId),
          eq(projectFiles.userId, uid)
        ))
        .then(r => r[0] ?? null);
      if (!row) return json({ content: '' });

      // Fetch from R2 when stored externally
      let content = '';
      if (row.storageId.startsWith('r2:') && isR2Configured()) {
        content = await getFile(`projects/${projectId}.xml`) ?? '';
      }

      return json({ ...row, content });
    }

    // ── Settings ──
    case 'users:getUserSettings': {
      if (!locals.user) throw error(401, 'Unauthorized');
      const row = await db
        .select()
        .from(settings)
        .where(eq(settings.userId, locals.user.id))
        .then(r => r[0] ?? null);
      // Return defaults if none saved yet
      if (!row) {
        return json({
          userId: locals.user.id,
          boardType: 'uno',
          theme: 'light',
          language: 'en',
          autoSave: true,
          tutorialCompleted: {},
          updatedAt: new Date(),
        });
      }
      return json(row);
    }

    // ── Profile ──
    case 'users:getUserProfile': {
      const targetUserId = args.userId ?? locals.user?.id;
      if (!targetUserId) return json(null);
      const row = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, targetUserId))
        .then(r => r[0] ?? null);
      if (row && !row.isPublic && row.userId !== locals.user?.id) return json(null);
      return json(row);
    }

    // ── Auth ──
    case 'auth:getCurrentUser': {
      if (!locals.user) return json(null);
      return json({
        id: locals.user.id,
        email: locals.user.email,
        name: locals.user.name,
        profileImage: locals.user.image,
        lastLogin: Date.now(),
      });
    }

    case 'auth:validateSession': {
      return json({
        isAuthenticated: !!locals.user,
        user: locals.user ? {
          id: locals.user.id,
          email: locals.user.email,
          name: locals.user.name,
          profileImage: locals.user.image,
        } : null,
      });
    }

    default:
      throw error(404, `Unknown query: ${name}`);
  }
}
