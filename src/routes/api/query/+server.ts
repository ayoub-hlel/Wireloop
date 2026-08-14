import { json, error, isHttpError } from '@sveltejs/kit';
import { z } from 'zod';
import { getDb } from '$lib/db';
import { projects, profiles, projectFiles, starredProjects, organizations, orgMembers, sharedProjects, notifications, invites, settings } from '$lib/db/schema/projects';
import { eq, and, desc, isNotNull, isNull, not, sql, aliasedTable } from 'drizzle-orm';

// ponytail: self-join alias for resolving forkedFrom → original project name.
const forkedFromProjects = aliasedTable(projects, 'forked_from_projects');
import { getFile, isR2Configured } from '$lib/server/r2';
import { validate, ValidationError } from '$lib/server/validate';
import { actionEnvelope, project, user, organization, notification, invite } from '$lib/server/validation';
import { checkRateLimit } from '$lib/server/ratelimit';
import { logServerError } from '$lib/server/log';
import { getOrgRole } from '$lib/server/authz';
import * as Sentry from '@sentry/sveltekit';

// ── Project Pages API: one entry point, filter + org scope drive the list ──
// ponytail: Recents/Resources removed from sidebar. Filters: starred, community,
// projects (personal or org-scoped), trash (personal or org-scoped).
export type ProjectFilter = 'starred' | 'community' | 'projects' | 'trash';

const uuid = z.string().min(1).max(128);
const zNoArgs = z.object({}).strict();
const zFilterList = z.object({
  filter: z.enum(['starred', 'community', 'projects', 'trash']),
  orgId: uuid.nullish(), // ponytail: nullish accepts undefined OR null (client sends null when no org selected)
}).strict();

const querySchemas = {
  'projects:getProject': project.get,
  'projects:getProjectFile': project.getFile,
  'projects:list': zFilterList,
  'projects:getStarredProjects': zNoArgs,
  'projects:getTrashedProjects': zNoArgs,
  'projects:getSharedMembers': project.getSharedMembers,
  'users:getUserProfile': user.getProfile,
  'users:getUserSettings': user.getSettings,
  'users:search': user.search,
  'org:getUserOrgs': organization.getUserOrgs,
  'org:getMembers': organization.getMembers,
  'org:getOrgProjects': organization.getOrgProjects,
  'notifications:list': notification.list,
  'invites:list': invite.list,
};

type Db = NonNullable<ReturnType<typeof getDb>>;

export async function POST({ request, locals, getClientAddress, platform }) {
  console.warn('[QUERY] POST entry');
  const limited = await checkRateLimit('query', locals, getClientAddress);
  if (limited) {
    console.warn('[QUERY] rate limited', { user: locals.user?.id });
    return limited;
  }
  try {
    const body = await request.json().catch(() => ({}));
    const { name, args } = validate(actionEnvelope, body);
    console.warn('[QUERY] action envelope parsed', { name, user: locals.user?.id });
    const db = getDb();
    if (!db) throw error(503, 'Database not available');

    const schema = querySchemas[name as keyof typeof querySchemas];
    const data = (schema ? validate<unknown>(schema, args) : args) as Record<string, unknown>;

    switch (name) {
      case 'projects:getProject': {
        const row = await db
          .select()
          .from(projects)
          .where(eq(projects.id, data.projectId as string))
          .then(r => r[0] ?? null);
        if (!row) return json(null);
        if (row.userId !== locals.user?.id && !row.isPublic) return json(null);
        return json(row);
      }

      case 'projects:getProjectFile': {
        if (!locals.user) throw error(401, 'Unauthorized');
        const uid = (data.userId as string) ?? locals.user.id;
        const row = await db
          .select()
          .from(projectFiles)
          .where(and(
            eq(projectFiles.projectId, data.projectId as string),
            eq(projectFiles.userId, uid),
          ))
          .then(r => r[0] ?? null);
        if (!row) return json({ content: '' });
        let content = '';
        if (row.storageId.startsWith('r2:') && isR2Configured()) {
          content = await getFile(`projects/${data.projectId as string}.xml`) ?? '';
        } else if (row.storageId.startsWith('inline:')) {
          content = await db
            .select({ workspace: projects.workspace })
            .from(projects)
            .where(eq(projects.id, data.projectId as string))
            .then(r => r[0]?.workspace ?? '');
        }
        return json({ ...row, content });
      }

      case 'projects:getSharedMembers': {
        if (!locals.user) throw error(401, 'Unauthorized');
        const proj = await db.select().from(projects).where(eq(projects.id, data.projectId as string)).then(r => r[0]);
        if (!proj || proj.orgId) return json([]);
        if (proj.userId !== locals.user.id) return json([]);
        const shares = await db.select().from(sharedProjects)
          .innerJoin(profiles, eq(sharedProjects.sharedWithUserId, profiles.userId))
          .where(eq(sharedProjects.projectId, data.projectId as string));
        return json(shares.map(r => ({
          userId: r.shared_projects.sharedWithUserId,
          name: r.profiles.name,
          email: r.profiles.email,
          role: r.shared_projects.permission,
        })));
      }

      case 'projects:list': {
        if (!locals.user) throw error(401, 'Unauthorized');
        const filter = data.filter as ProjectFilter;
        const orgId = data.orgId as string | undefined;
        console.warn('[QUERY] case:projects:list', { filter, orgId, user: locals.user.id });
        return json(await listProjects(db, locals.user.id, filter, orgId));
      }

      // ponytail: legacy aliases kept so old callers don't 404 during the transition.
      case 'projects:getStarredProjects': {
        if (!locals.user) throw error(401, 'Unauthorized');
        return json(await listProjects(db, locals.user.id, 'starred', undefined));
      }

      case 'projects:getTrashedProjects': {
        if (!locals.user) throw error(401, 'Unauthorized');
        return json(await listProjects(db, locals.user.id, 'trash', undefined));
      }

      case 'users:getUserProfile': {
        const targetUserId = (data.userId as string) ?? locals.user?.id;
        if (!targetUserId) return json(null);
        const row = await db.select().from(profiles).where(eq(profiles.userId, targetUserId)).then(r => r[0] ?? null);
        if (row && !row.isPublic && row.userId !== locals.user?.id) return json(null);
        return json(row);
      }

      // ponytail: own settings only — userId arg is ignored for scoping so a caller
      // can never read someone else's row. Returns null when unset (client falls back to defaults).
      case 'users:getUserSettings': {
        if (!locals.user) return json(null);
        const row = await db.select().from(settings).where(eq(settings.userId, locals.user.id)).then(r => r[0] ?? null);
        return json(row);
      }

      // ponytail: email-prefix search for the org creator invite tokenizer.
      // Excludes the searching user themselves. Returns id, name, email.
      case 'users:search': {
        if (!locals.user) throw error(401, 'Unauthorized');
        const q = (data.q as string).toLowerCase();
        const limit = (data.limit as number) ?? 8;
        const rows = await db.select({
          userId: profiles.userId,
          name: profiles.name,
          email: profiles.email,
        })
          .from(profiles)
          .where(and(
            sql`${profiles.email} LIKE ${q + '%'}`,
            not(eq(profiles.userId, locals.user.id)),
          ))
          .orderBy(profiles.name)
          .limit(limit);
        return json(rows);
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

      case 'org:getUserOrgs': {
        if (!locals.user) throw error(401, 'Unauthorized');
        const userOrgs = await db.select().from(organizations)
          .innerJoin(orgMembers, eq(organizations.id, orgMembers.orgId))
          .where(eq(orgMembers.userId, locals.user.id))
          .orderBy(desc(organizations.createdAt));
        return json(userOrgs.map(r => r.organizations));
      }

      case 'org:getMembers': {
        if (!locals.user) throw error(401, 'Unauthorized');
        const memberCheck = await getOrgRole(db, data.orgId as string, locals.user.id);
        console.warn('[QUERY] case:org:getMembers', { orgId: data.orgId, isMember: !!memberCheck, user: locals.user.id });
        if (!memberCheck) return json([]);
        const members = await db.select().from(orgMembers)
          .innerJoin(profiles, eq(orgMembers.userId, profiles.userId))
          .where(eq(orgMembers.orgId, data.orgId as string))
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
        const projectCheck = await getOrgRole(db, data.orgId as string, locals.user.id);
        if (!projectCheck) return json([]);
        return json(await listProjects(db, locals.user.id, 'projects', data.orgId as string));
      }

      case 'notifications:list': {
        if (!locals.user) throw error(401, 'Unauthorized');
        const rows = await db.select().from(notifications)
          .where(eq(notifications.userId, locals.user.id))
          .orderBy(desc(notifications.createdAt))
          .limit(50);
        return json(rows);
      }

      case 'invites:list': {
        if (!locals.user) throw error(401, 'Unauthorized');
        // ponytail: lazy backfill — invites sent to my email before I signed up have inviteeId NULL.
        // Match by email, set inviteeId, so they show up under my account.
        const pendingByEmail = await db.select().from(invites)
          .where(and(eq(invites.inviteeEmail, locals.user.email ?? ''), eq(invites.status, 'pending'), isNull(invites.inviteeId)));
        console.warn('[QUERY] case:invites:list — backfill', { backfillCount: pendingByEmail.length, email: locals.user.email });
        for (const inv of pendingByEmail) {
          await db.update(invites).set({ inviteeId: locals.user.id }).where(eq(invites.id, inv.id));
        }
        const rows = await db.select().from(invites)
          .where(and(eq(invites.status, 'pending'), eq(invites.inviteeId, locals.user.id)))
          .orderBy(desc(invites.createdAt));
        return json(rows);
      }

      default:
        console.warn('[QUERY] unknown query', { name });
        throw error(404, `Unknown query: ${name}`);
    }
  } catch (e) {
    if (e instanceof ValidationError) {
      console.warn('[QUERY] validation failed', { issues: e.issues, user: locals.user?.id });
      return json({ error: 'Validation failed', issues: e.issues }, { status: 400 });
    }
    // Deliberate HTTP errors (401/404/503) are the contract, not failures —
    // rethrow as-is instead of relabelling them 500.
    if (isHttpError(e)) throw e;
    Sentry.captureException(e, { tags: { route: 'query' } });
    logServerError('api/query failed', { error: String(e), user: locals.user?.id }, platform?.ctx?.waitUntil);
    console.warn('[QUERY] error', { error: String(e), user: locals.user?.id });
    // Don't leak infrastructure error messages (e.g. Neon/fetch "Illegal invocation")
    // to the client — they're noisy and expose internal details.
    const raw = e instanceof Error ? e.message : String(e);
    const msg = /illegal invocation|fetch failed/i.test(raw)
      ? 'Database temporarily unavailable'
      : raw;
    throw error(500, msg);
  }
}

// ── Project Pages API core: one function, filter + scope → rows ──
async function listProjects(db: Db, userId: string, filter: ProjectFilter, orgId?: string) {
  // org scope: only valid if the user is a member. Null orgId + projects/trash → personal.
  if (filter === 'projects' || filter === 'trash') {
    if (orgId) {
      const role = await getOrgRole(db, orgId, userId);
      if (!role) return [];
      return orgProjectQuery(db, filter, orgId);
    }
    return personalProjectQuery(db, filter, userId);
  }

  if (filter === 'starred') {
    const rows = await db.select({
      id: projects.id,
      userId: projects.userId,
      name: projects.name,
      description: projects.description,
      workspace: projects.workspace,
      boardType: projects.boardType,
      isPublic: projects.isPublic,
      tags: projects.tags,
      likes: projects.likes,
      views: projects.views,
      orgId: projects.orgId,
      thumbnailUrl: projects.thumbnailUrl,
      lastOpenedAt: projects.lastOpenedAt,
      deletedAt: projects.deletedAt,
      deletedBy: projects.deletedBy,
      isForked: projects.isForked,
      forkedFrom: projects.forkedFrom,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      creatorName: profiles.name,
      originalName: forkedFromProjects.name,
    })
      .from(starredProjects)
      .innerJoin(projects, eq(starredProjects.projectId, projects.id))
      .leftJoin(profiles, eq(projects.userId, profiles.userId))
      .leftJoin(forkedFromProjects, eq(projects.forkedFrom, forkedFromProjects.id))
      .where(and(eq(starredProjects.userId, userId), isNull(projects.deletedAt)))
      .orderBy(desc(starredProjects.createdAt));
    return rows;
  }

  if (filter === 'community') {
    // ponytail: community = personal public projects only (org projects can't be public — enforced by DB index).
    const rows = await db.select({
      id: projects.id,
      userId: projects.userId,
      name: projects.name,
      description: projects.description,
      workspace: projects.workspace,
      boardType: projects.boardType,
      isPublic: projects.isPublic,
      tags: projects.tags,
      likes: projects.likes,
      views: projects.views,
      orgId: projects.orgId,
      thumbnailUrl: projects.thumbnailUrl,
      lastOpenedAt: projects.lastOpenedAt,
      deletedAt: projects.deletedAt,
      deletedBy: projects.deletedBy,
      isForked: projects.isForked,
      forkedFrom: projects.forkedFrom,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      creatorName: profiles.name,
      originalName: forkedFromProjects.name,
    })
      .from(projects)
      .leftJoin(profiles, eq(projects.userId, profiles.userId))
      .leftJoin(forkedFromProjects, eq(projects.forkedFrom, forkedFromProjects.id))
      .where(and(eq(projects.isPublic, true), isNull(projects.deletedAt), isNull(projects.orgId), not(eq(projects.userId, userId))))
      .orderBy(desc(projects.updatedAt))
      .limit(100);
    return rows;
  }

  return [];
}

async function personalProjectQuery(db: Db, filter: 'projects' | 'trash', userId: string) {
  const baseAnd = [eq(projects.userId, userId), isNull(projects.orgId)];
  const selectWithProvenance = () => db.select({
    id: projects.id,
    userId: projects.userId,
    name: projects.name,
    description: projects.description,
    workspace: projects.workspace,
    boardType: projects.boardType,
    isPublic: projects.isPublic,
    tags: projects.tags,
    likes: projects.likes,
    views: projects.views,
    orgId: projects.orgId,
    thumbnailUrl: projects.thumbnailUrl,
    lastOpenedAt: projects.lastOpenedAt,
    deletedAt: projects.deletedAt,
    deletedBy: projects.deletedBy,
    isForked: projects.isForked,
    forkedFrom: projects.forkedFrom,
    createdAt: projects.createdAt,
    updatedAt: projects.updatedAt,
    creatorName: profiles.name,
    originalName: forkedFromProjects.name,
  })
    .from(projects)
    .leftJoin(profiles, eq(projects.userId, profiles.userId))
    .leftJoin(forkedFromProjects, eq(projects.forkedFrom, forkedFromProjects.id));
  if (filter === 'trash') {
    const rows = await selectWithProvenance()
      .where(and(...baseAnd, isNotNull(projects.deletedAt)))
      .orderBy(desc(projects.deletedAt));
    return rows;
  }
  // projects: active only, sorted by recently opened (default sort).
  const rows = await selectWithProvenance()
    .where(and(...baseAnd, isNull(projects.deletedAt)))
    .orderBy(desc(sql`coalesce(${projects.lastOpenedAt}, ${projects.createdAt})`));
  return rows;
}

async function orgProjectQuery(db: Db, filter: 'projects' | 'trash', orgId: string) {
  const selectWithProvenance = () => db.select({
    id: projects.id,
    userId: projects.userId,
    name: projects.name,
    description: projects.description,
    workspace: projects.workspace,
    boardType: projects.boardType,
    isPublic: projects.isPublic,
    tags: projects.tags,
    likes: projects.likes,
    views: projects.views,
    orgId: projects.orgId,
    thumbnailUrl: projects.thumbnailUrl,
    lastOpenedAt: projects.lastOpenedAt,
    deletedAt: projects.deletedAt,
    deletedBy: projects.deletedBy,
    isForked: projects.isForked,
    forkedFrom: projects.forkedFrom,
    createdAt: projects.createdAt,
    updatedAt: projects.updatedAt,
    creatorName: profiles.name,
    originalName: forkedFromProjects.name,
  })
    .from(projects)
    .leftJoin(profiles, eq(projects.userId, profiles.userId))
    .leftJoin(forkedFromProjects, eq(projects.forkedFrom, forkedFromProjects.id));
  if (filter === 'trash') {
    // ponytail: shared org trash shows who trashed + when (deletedBy, deletedAt).
    const rows = await db.select({
      id: projects.id,
      userId: projects.userId,
      name: projects.name,
      description: projects.description,
      workspace: projects.workspace,
      boardType: projects.boardType,
      isPublic: projects.isPublic,
      tags: projects.tags,
      likes: projects.likes,
      views: projects.views,
      orgId: projects.orgId,
      thumbnailUrl: projects.thumbnailUrl,
      lastOpenedAt: projects.lastOpenedAt,
      deletedAt: projects.deletedAt,
      deletedBy: projects.deletedBy,
      isForked: projects.isForked,
      forkedFrom: projects.forkedFrom,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      creatorName: profiles.name,
      originalName: forkedFromProjects.name,
    })
      .from(projects)
      .leftJoin(profiles, eq(projects.userId, profiles.userId))
      .leftJoin(forkedFromProjects, eq(projects.forkedFrom, forkedFromProjects.id))
      .where(and(eq(projects.orgId, orgId), isNotNull(projects.deletedAt)))
      .orderBy(desc(projects.deletedAt));
    return Promise.all(rows.map(async (r: typeof projects.$inferSelect & { creatorName: string | null; originalName: string | null }) => {
      const trashByName = r.deletedBy
        ? await db.select({ name: profiles.name }).from(profiles).where(eq(profiles.userId, r.deletedBy)).then(r2 => r2[0]?.name)
        : null;
      return { ...r, deletedByName: trashByName };
    }));
  }
  const rows = await selectWithProvenance()
    .where(and(eq(projects.orgId, orgId), isNull(projects.deletedAt)))
    .orderBy(desc(sql`coalesce(${projects.lastOpenedAt}, ${projects.createdAt})`));
  return rows;
}
