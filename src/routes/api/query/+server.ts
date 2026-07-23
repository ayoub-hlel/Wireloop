import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { projects, settings, profiles, projectFiles, starredProjects, recentProjects, organizations, orgMembers } from '$lib/db/schema/projects';
import { eq, and, desc, isNotNull, isNull } from 'drizzle-orm';
import { getFile, isR2Configured } from '$lib/server/r2';
import { validate, ValidationError } from '$lib/server/validate';
import { actionEnvelope, project, user, organization } from '$lib/server/validation';

const querySchemas = {
  'projects:getProject': project.get,
  'projects:getProjectFile': project.getFile,
  'projects:getDrafts': project.getDrafts,
  'users:getUserProfile': user.getProfile,
  'org:getUserOrgs': organization.getUserOrgs,
  'org:getMembers': organization.getMembers,
  'org:getOrgProjects': organization.getOrgProjects,
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

      case 'projects:getStarredProjects': {
        if (!locals.user) throw error(401, 'Unauthorized');
        const starredRows = await db
          .select()
          .from(starredProjects)
          .innerJoin(projects, eq(starredProjects.projectId, projects.id))
          .where(eq(starredProjects.userId, locals.user.id))
          .orderBy(desc(starredProjects.createdAt));
        return json(starredRows.map(r => r.projects));
      }

      case 'projects:getTrashedProjects': {
        if (!locals.user) throw error(401, 'Unauthorized');
        const trashedRows = await db
          .select()
          .from(projects)
          .where(
            and(
              eq(projects.userId, locals.user.id),
              isNotNull(projects.deletedAt),
            ),
          )
          .orderBy(desc(projects.deletedAt));
        return json(trashedRows);
      }

      case 'projects:getDrafts': {
        if (!locals.user) throw error(401, 'Unauthorized');
        const drafts = await db
          .select()
          .from(projects)
          .where(
            and(
              eq(projects.userId, locals.user.id),
              isNull(projects.orgId),
              isNull(projects.deletedAt),
            ),
          )
          .orderBy(desc(projects.updatedAt));
        return json(drafts);
      }

      case 'projects:getRecentProjects': {
        if (!locals.user) throw error(401, 'Unauthorized');
        const recentRows = await db
          .select()
          .from(recentProjects)
          .innerJoin(projects, eq(recentProjects.projectId, projects.id))
          .where(eq(recentProjects.userId, locals.user.id))
          .orderBy(desc(recentProjects.lastAccessedAt))
          .limit(20);
        return json(recentRows.map(r => r.projects));
      }

      case 'org:getUserOrgs': {
        if (!locals.user) throw error(401, 'Unauthorized');
        const userOrgs = await db
          .select()
          .from(organizations)
          .innerJoin(orgMembers, eq(organizations.id, orgMembers.orgId))
          .where(eq(orgMembers.userId, locals.user.id))
          .orderBy(desc(organizations.createdAt));
        return json(userOrgs.map(r => r.organizations));
      }

      case 'org:getMembers': {
        if (!locals.user) throw error(401, 'Unauthorized');
        const memberCheck = await getOrgRole(db, data.orgId, locals.user.id);
        if (!memberCheck) return json([]);
        const members = await db
          .select()
          .from(orgMembers)
          .innerJoin(profiles, eq(orgMembers.userId, profiles.userId))
          .where(eq(orgMembers.orgId, data.orgId))
          .orderBy(orgMembers.createdAt);
        return json(members.map(r => ({
          userId: r.org_members.userId,
          role: r.org_members.role,
          createdAt: r.org_members.createdAt,
          name: r.profiles.name,
          email: r.profiles.email,
          profileImage: r.profiles.profileImage,
          username: r.profiles.username,
        })));
      }

      case 'org:getOrgProjects': {
        if (!locals.user) throw error(401, 'Unauthorized');
        const projectCheck = await getOrgRole(db, data.orgId, locals.user.id);
        if (!projectCheck) return json([]);
        const orgProjects = await db
          .select()
          .from(projects)
          .where(eq(projects.orgId, data.orgId))
          .orderBy(desc(projects.createdAt));
        return json(orgProjects);
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

async function getOrgRole(db: any, orgId: string, userId: string): Promise<'owner' | 'admin' | 'member' | null> {
  const org = await db.select().from(organizations).where(eq(organizations.id, orgId)).then(r => r[0]);
  if (!org) return null;
  if (org.ownerId === userId) return 'owner';
  const member = await db.select().from(orgMembers).where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId))).then(r => r[0]);
  return member?.role ?? null;
}
