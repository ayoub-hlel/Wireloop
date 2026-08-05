import { error } from '@sveltejs/kit';
import { getFileBuffer } from '$lib/server/r2';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const result = await getFileBuffer(`thumbnails/${params.projectId}.png`);
  if (!result) error(404, 'Thumbnail not found');
  return new Response(result.body as BodyInit, {
    headers: {
      'content-type': result.contentType,
      // ponytail: stale up to 1 min; the upload endpoint cache-busts with ?v=
      'cache-control': 'public, max-age=60',
    },
  });
};