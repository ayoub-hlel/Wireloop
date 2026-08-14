import { getDb } from '$lib/db';
import { projects } from '$lib/db/schema/projects';
import { eq, and, isNull } from 'drizzle-orm';

type Db = NonNullable<ReturnType<typeof getDb>>;

// ponytail: duplicate avoidance scoped per container. A name can repeat across
// personal/org boundaries but never twice inside the same container (incl. trashed).
// personal scope → userId = me AND orgId IS NULL; org scope → orgId = X.
export type NameScope =
  | { kind: 'personal'; userId: string }
  | { kind: 'org'; orgId: string };

export async function containerProjectNames(db: Db, scope: NameScope): Promise<Set<string>> {
  console.warn('[PROJECTS] containerProjectNames entry', { scope });
  const rows = await db
    .select({ name: projects.name })
    .from(projects)
    .where(scope.kind === 'personal'
      ? and(eq(projects.userId, scope.userId), isNull(projects.orgId))
      : eq(projects.orgId, scope.orgId));
  console.warn('[PROJECTS] containerProjectNames result', { scope, count: rows.length });
  return new Set(rows.map(r => r.name.toLowerCase()));
}

// ponytail: legacy wrapper — personal scope for the current user.
export async function userProjectNames(db: Db, userId: string): Promise<Set<string>> {
  return containerProjectNames(db, { kind: 'personal', userId });
}

export function uniqueCopyName(base: string, taken: Set<string>): string {
  const lower = (s: string) => s.toLowerCase();
  if (!taken.has(lower(base))) {
    console.warn('[PROJECTS] uniqueCopyName — base available', { base });
    return base;
  }
  const candidate = `${base} copy`;
  if (!taken.has(lower(candidate))) {
    console.warn('[PROJECTS] uniqueCopyName — using first copy', { base, candidate });
    return candidate;
  }
  let n = 1;
  while (taken.has(lower(`${base} copy ${n}`))) n += 1;
  console.warn('[PROJECTS] uniqueCopyName — using numbered copy', { base, candidate: `${base} copy ${n}` });
  return `${base} copy ${n}`;
}
