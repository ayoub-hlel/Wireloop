import { json, error } from '@sveltejs/kit';
import { putFile } from '$lib/server/r2';
import { checkRateLimit } from '$lib/server/ratelimit';
import { getDb } from '$lib/db';
import { projects } from '$lib/db/schema/projects';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

const MAX_SIZE = 2 * 1024 * 1024;

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
  console.warn('[UPLOAD] thumbnail POST entry', { user: locals.user?.id });
  if (!locals.user) error(401, 'Unauthorized');
  const limited = await checkRateLimit('upload', locals, getClientAddress);
  if (limited) return limited;

  const data = await request.formData();
  const projectId = data.get('projectId') as string | null;
  const file = data.get('thumbnail') as File | null;
  if (!projectId || !file) error(400, 'Missing projectId or thumbnail');
  if (file.type !== 'image/png') error(400, 'Only PNG thumbnails accepted');
  if (file.size > MAX_SIZE) error(400, 'Thumbnail too large');

  // ownership check: only the project owner can set the thumbnail
  const db = getDb();
  if (!db) error(503, 'Database not available');
  const row = await db
    .select({ owner: projects.userId })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, locals.user.id)))
    .then(r => r[0]);
  if (!row) {
    console.warn('[UPLOAD] thumbnail ownership check failed', { projectId, user: locals.user.id });
    error(404, 'Project not found');
  }

  const buffer = await file.arrayBuffer();
  const key = `thumbnails/${projectId}.png`;

  await putFile(key, new Uint8Array(buffer), 'image/png');
  console.warn('[UPLOAD] thumbnail uploaded', { key, size: file.size });

  const ts = Math.floor(Date.now() / 1000);
  const url = `/api/thumbnails/${projectId}?v=${ts}`;
  await db.update(projects).set({ thumbnailUrl: url }).where(eq(projects.id, projectId));

  return json({ url });
};