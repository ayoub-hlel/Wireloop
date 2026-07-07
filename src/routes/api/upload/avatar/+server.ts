import { json, error } from '@sveltejs/kit';
import { putFile } from '$lib/server/r2';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) error(401, 'Unauthorized');

  const data = await request.formData();
  const file = data.get('avatar') as File | null;
  if (!file) error(400, 'No file provided');

  const buffer = await file.arrayBuffer();
  const ext = file.name.split('.').pop() || 'png';
  const key = `avatars/${locals.user.id}.${ext}`;

  await putFile(key, new Uint8Array(buffer), file.type);

  return json({ url: `/api/avatars/${locals.user.id}` });
};
