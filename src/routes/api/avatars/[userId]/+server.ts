import { error } from '@sveltejs/kit';
import { getFileBuffer } from '$lib/server/r2';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  console.warn('[ASSETS] avatar GET entry', { userId: params.userId });
  const exts = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
  for (const ext of exts) {
    const result = await getFileBuffer(`avatars/${params.userId}.${ext}`);
    if (result) {
      console.warn('[ASSETS] avatar hit', { userId: params.userId, ext });
      return new Response(result.body as BodyInit, {
        headers: {
          'content-type': result.contentType,
          'cache-control': 'public, max-age=31536000, immutable',
        },
      });
    }
  }
  console.warn('[ASSETS] avatar miss', { userId: params.userId });
  error(404, 'Avatar not found');
};
