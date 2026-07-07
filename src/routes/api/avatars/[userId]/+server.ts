import { error } from '@sveltejs/kit';
import { getFileBuffer } from '$lib/server/r2';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const exts = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
  for (const ext of exts) {
    const result = await getFileBuffer(`avatars/${params.userId}.${ext}`);
    if (result) {
      return new Response(result.body, {
        headers: {
          'content-type': result.contentType,
          'cache-control': 'public, max-age=31536000, immutable',
        },
      });
    }
  }
  error(404, 'Avatar not found');
};
