import { describe, it, expect } from 'vitest';
import { generateId } from 'better-auth';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon, neonConfig } from '@neondatabase/serverless';
import { user as userTable } from '$lib/db/schema/auth';
import { projects, starredProjects } from '$lib/db/schema/projects';
import { eq, and } from 'drizzle-orm';

neonConfig.disableWarningInBrowsers = true;

describe('projects:starProject', () => {
  it('inserts a starred_projects row for the authenticated user', async () => {
    const db = drizzle(neon(process.env.DATABASE_URL!), {
      schema: { user: userTable, projects, starredProjects },
    });

    const userId = generateId();
    const now = new Date();

    await db.insert(userTable).values({
      id: userId,
      name: 'Star Tester',
      email: `star-${Date.now()}@example.com`,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    const projectId = generateId();
    await db.insert(projects).values({
      id: projectId,
      userId,
      name: 'Star Test Project',
      workspace: '',
      createdAt: now,
      updatedAt: now,
    });

    const { POST } = await import('../routes/api/mutation/+server');

    await expect(
      POST({
        request: new Request('http://localhost', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'projects:starProject',
            args: { projectId },
          }),
        }),
        locals: { user: { id: userId, email: 'test@example.com', name: 'Star Tester' } },
      }),
    ).resolves.toMatchObject({ status: 200 });

    const star = await db
      .select()
      .from(starredProjects)
      .where(
        and(
          eq(starredProjects.userId, userId),
          eq(starredProjects.projectId, projectId),
        ),
      )
      .then((r) => r[0]);
    expect(star).toBeDefined();
    expect(star!.userId).toBe(userId);
    expect(star!.projectId).toBe(projectId);
  });
});
