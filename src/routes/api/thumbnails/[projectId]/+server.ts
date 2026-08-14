import { error } from '@sveltejs/kit';
import { getFileBuffer } from '$lib/server/r2';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  console.warn('[ASSETS] thumbnail GET entry', { projectId: params.projectId });
  const result = await getFileBuffer(`thumbnails/${params.projectId}.png`);
  if (!result) {
    console.warn('[ASSETS] thumbnail miss', { projectId: params.projectId });
    error(404, 'Thumbnail not found');
  }
  console.warn('[ASSETS] thumbnail hit', { projectId: params.projectId });
  return new Response(result.body as BodyInit, {
    headers: {
      'content-type': result.contentType,
      // ponytail: stale up to 1 min; the upload endpoint cache-busts with ?v=
      'cache-control': 'public, max-age=60',
    },
  });
};