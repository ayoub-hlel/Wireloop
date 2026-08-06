import { getDb } from '$lib/db';
import { projects } from '$lib/db/schema/projects';
import { eq } from 'drizzle-orm';

type Db = NonNullable<ReturnType<typeof getDb>>;

// ponytail: case-insensitive duplicate avoidance. "x" -> "x copy" -> "x copy 1" -> "x copy 2".
// Copying "x copy 1" yields "x copy 1 copy" (the base is always the source's own name).
export async function userProjectNames(db: Db, userId: string): Promise<Set<string>> {
  const rows = await db
    .select({ name: projects.name })
    .from(projects)
    .where(eq(projects.userId, userId));
  return new Set(rows.map(r => r.name.toLowerCase()));
}

export function uniqueCopyName(base: string, taken: Set<string>): string {
  const lower = (s: string) => s.toLowerCase();
  if (!taken.has(lower(base))) return base;
  let candidate = `${base} copy`;
  if (!taken.has(lower(candidate))) return candidate;
  let n = 1;
  while (taken.has(lower(`${base} copy ${n}`))) n += 1;
  return `${base} copy ${n}`;
}
