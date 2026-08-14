import type { R2Bucket } from "@cloudflare/workers-types";
// ponytail: thin R2 wrapper — Cloudflare binding preferred, S3 env-var fallback
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';

// ponytail: global lock, per-account locks if throughput matters
let _binding: R2Bucket | null = null;

/** Call from hooks.server.ts to inject the Cloudflare R2 binding from platform.env.R2 */
export function setR2Binding(binding: R2Bucket) {
  _binding = binding;
  console.warn('[R2] binding set');
}

function getClient() {
  return new S3Client({
    region: 'auto',
    endpoint: env.R2_ENDPOINT || '',
    credentials: { accessKeyId: env.R2_ACCESS_KEY || '', secretAccessKey: env.R2_SECRET_KEY || '' },
    requestChecksumCalculation: 'WHEN_REQUIRED',
  });
}

export function isR2Configured(): boolean {
  const configured = !!(_binding || (env.R2_ENDPOINT && env.R2_ACCESS_KEY && env.R2_SECRET_KEY && env.R2_BUCKET));
  console.warn('[R2] isR2Configured', { configured, hasBinding: !!_binding });
  return configured;
}

export async function putFile(key: string, content: string | ArrayBuffer | Uint8Array, contentType: string): Promise<void> {
  console.warn('[R2] putFile entry', { key, contentType, isBinding: !!_binding });
  if (_binding) {
    await _binding.put(key, content, { httpMetadata: { contentType } });
    console.warn('[R2] putFile done (binding)', { key });
    return;
  }
  if (!isR2Configured()) throw new Error('R2 not configured');
  await getClient().send(new PutObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: key,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    Body: content as any,
    ContentType: contentType,
  }));
  console.warn('[R2] putFile done (s3)', { key });
}

export async function getFile(key: string): Promise<string | null> {
  console.warn('[R2] getFile entry', { key, isBinding: !!_binding });
  if (_binding) {
    const obj = await _binding.get(key);
    console.warn('[R2] getFile result (binding)', { key, hit: !!obj });
    return obj ? await obj.text() : null;
  }
  if (!isR2Configured()) {
    console.warn('[R2] getFile — not configured', { key });
    return null;
  }
  const result = await getClient().send(new GetObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: key,
  }));
  console.warn('[R2] getFile result (s3)', { key, hit: !!result.Body });
  return await result.Body?.transformToString() ?? null;
}

export async function getFileBuffer(key: string): Promise<{ body: Uint8Array; contentType: string } | null> {
  console.warn('[R2] getFileBuffer entry', { key, isBinding: !!_binding });
  if (_binding) {
    const obj = await _binding.get(key);
    if (!obj) {
      console.warn('[R2] getFileBuffer miss (binding)', { key });
      return null;
    }
    const buf = await obj.arrayBuffer();
    console.warn('[R2] getFileBuffer hit (binding)', { key, size: buf.byteLength });
    return { body: new Uint8Array(buf), contentType: obj.httpMetadata?.contentType ?? 'application/octet-stream' };
  }
  if (!isR2Configured()) {
    console.warn('[R2] getFileBuffer — not configured', { key });
    return null;
  }
  const result = await getClient().send(new GetObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: key,
  }));
  if (!result.Body) {
    console.warn('[R2] getFileBuffer miss (s3)', { key });
    return null;
  }
  const buf = await result.Body.transformToByteArray();
  console.warn('[R2] getFileBuffer hit (s3)', { key, size: buf.byteLength });
  return { body: buf, contentType: result.ContentType ?? 'application/octet-stream' };
}

export async function deleteFile(key: string): Promise<void> {
  console.warn('[R2] deleteFile entry', { key, isBinding: !!_binding });
  if (_binding) {
    await _binding.delete(key);
    console.warn('[R2] deleteFile done (binding)', { key });
    return;
  }
  if (!isR2Configured()) {
    console.warn('[R2] deleteFile — not configured', { key });
    return;
  }
  await getClient().send(new DeleteObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: key,
  }));
  console.warn('[R2] deleteFile done (s3)', { key });
}
