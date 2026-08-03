import { json, error } from '@sveltejs/kit';
import { putFile } from '$lib/server/r2';
import { checkRateLimit } from '$lib/server/ratelimit';
import type { RequestHandler } from './$types';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
  if (!locals.user) error(401, 'Unauthorized');
  const limited = await checkRateLimit('upload', locals, getClientAddress);
  if (limited) return limited;

  const data = await request.formData();
  const file = data.get('avatar') as File | null;
  if (!file) error(400, 'No file provided');
  if (!ALLOWED_TYPES.includes(file.type)) error(400, 'Invalid file type. Allowed: JPEG, PNG, WebP');
  if (file.size > MAX_SIZE) error(400, 'File too large. Max 5MB');

  const buffer = await file.arrayBuffer();
  const ext = file.name.split('.').pop() || 'png';
  const key = `avatars/${locals.user.id}.${ext}`;

  await putFile(key, new Uint8Array(buffer), file.type);

  return json({ url: `/api/avatars/${locals.user.id}` });
};
