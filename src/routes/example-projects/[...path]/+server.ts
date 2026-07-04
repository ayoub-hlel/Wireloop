// ponytail: R2-backed static file proxy — no more 300 MiB in the deploy
import type { RequestHandler } from '@sveltejs/kit';
import { building } from '$app/environment';
import { setR2Binding } from '$lib/server/r2';

const MIME_TYPES: Record<string, string> = {
  gif: 'image/gif',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  svg: 'image/svg+xml',
  xml: 'application/xml',
  json: 'application/json',
};

function mime(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return MIME_TYPES[ext] ?? 'application/octet-stream';
}

export const GET: RequestHandler = async ({ params, platform }) => {
  const path = params.path;
  if (!path) return new Response('Not found', { status: 404 });
  if (path.includes('..')) return new Response('Bad request', { status: 400 });

  // Wire binding if not set yet (lazy init on first call)
  if (!building && platform?.env?.R2) {
    setR2Binding(platform.env.R2);
  }

  const r2 = platform?.env?.R2;
  if (!r2) return new Response('Not found', { status: 404 });

  const obj = await r2.get(`example-projects/${path}`);
  if (!obj) return new Response('Not found', { status: 404 });

  // ponytail: write() for text, blob() for binary — keeps it simple
  const contentType = mime(path);
  const isText = contentType.startsWith('text/') || contentType === 'application/xml' || contentType === 'application/json';
  const body = isText ? await obj.text() : (await obj.blob() as Blob);
  return new Response(body, {
    headers: {
      'content-type': contentType,
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
};
