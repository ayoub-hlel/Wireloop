import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { projects, settings, profiles, projectFiles } from '$lib/db/schema/projects';
import { eq, and, desc } from 'drizzle-orm';
import { getFile, isR2Configured } from '$lib/server/r2';
import { validate, ValidationError } from '$lib/server/validate';
import { actionEnvelope, project, user } from '$lib/server/validation';

const querySchemas = {
  'projects:getProject': project.get,
  'projects:getPublicProject': project.getPublic,
  'projects:getPublicProjects': project.getPublicList,
  'projects:getProjectFile': project.getFile,
  'users:getUserProfile': user.getProfile,
};

export async function POST({ request, locals }) {
  try {
    const body = await request.json().catch(() => ({}));
    const { name, args } = validate(actionEnvelope, body);
    const db = getDb();
    if (!db) throw error(503, 'Database not available');

    const schema = querySchemas[name];
    const data: any = schema ? validate(schema, args) : args;

    switch (name) {
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
        const row = await db
          .select()
          .from(projects)
          .where(eq(projects.id, data.projectId))
          .then(r => r[0] ?? null);
        if (!row) return json(null);
        if (row.userId !== locals.user?.id && !row.isPublic) return json(null);
        return json(row);
      }

      case 'projects:getPublicProject': {
        const row = await db
          .select()
          .from(projects)
          .where(and(eq(projects.id, data.projectId), eq(projects.isPublic, true)))
          .then(r => r[0] ?? null);
        return json(row);
      }

      case 'projects:getPublicProjects': {
        const rows = await db
          .select()
          .from(projects)
          .where(eq(projects.isPublic, true))
          .orderBy(desc(projects.createdAt))
          .limit(data.limit ?? 20);
        return json(rows);
      }

      case 'projects:getProjectFile': {
        if (!locals.user) throw error(401, 'Unauthorized');
        const uid = data.userId ?? locals.user.id;
        const row = await db
          .select()
          .from(projectFiles)
          .where(and(
            eq(projectFiles.projectId, data.projectId),
            eq(projectFiles.userId, uid)
          ))
          .then(r => r[0] ?? null);
        if (!row) return json({ content: '' });

        let content = '';
        if (row.storageId.startsWith('r2:') && isR2Configured()) {
          content = await getFile(`projects/${data.projectId}.xml`) ?? '';
        }

        return json({ ...row, content });
      }

      case 'users:getUserSettings': {
        if (!locals.user) throw error(401, 'Unauthorized');
        const row = await db
          .select()
          .from(settings)
          .where(eq(settings.userId, locals.user.id))
          .then(r => r[0] ?? null);
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

      case 'users:getUserProfile': {
        const targetUserId = data.userId ?? locals.user?.id;
        if (!targetUserId) return json(null);
        const row = await db
          .select()
          .from(profiles)
          .where(eq(profiles.userId, targetUserId))
          .then(r => r[0] ?? null);
        if (row && !row.isPublic && row.userId !== locals.user?.id) return json(null);
        return json(row);
      }

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
  } catch (e) {
    if (e instanceof ValidationError) {
      return json({ error: 'Validation failed', issues: e.issues }, { status: 400 });
    }
    throw e;
  }
}
