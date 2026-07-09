import type { R2Bucket } from "@cloudflare/workers-types";
// ponytail: thin R2 wrapper — Cloudflare binding preferred, S3 env-var fallback
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';

// ponytail: global lock, per-account locks if throughput matters
let _binding: R2Bucket | null = null;

/** Call from hooks.server.ts to inject the Cloudflare R2 binding from platform.env.R2 */
export function setR2Binding(binding: R2Bucket) {
  _binding = binding;
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
  if (_binding) return true;
  return !!(env.R2_ENDPOINT && env.R2_ACCESS_KEY && env.R2_SECRET_KEY && env.R2_BUCKET);
}

export async function putFile(key: string, content: string | ArrayBuffer | Uint8Array, contentType: string): Promise<void> {
  if (_binding) {
    await _binding.put(key, content, { httpMetadata: { contentType } });
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
}

export async function getFile(key: string): Promise<string | null> {
  if (_binding) {
    const obj = await _binding.get(key);
    return obj ? await obj.text() : null;
  }
  if (!isR2Configured()) return null;
  const result = await getClient().send(new GetObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: key,
  }));
  return await result.Body?.transformToString() ?? null;
}

export async function getFileBuffer(key: string): Promise<{ body: Uint8Array; contentType: string } | null> {
  if (_binding) {
    const obj = await _binding.get(key);
    if (!obj) return null;
    const buf = await obj.arrayBuffer();
    return { body: new Uint8Array(buf), contentType: obj.httpMetadata?.contentType ?? 'application/octet-stream' };
  }
  if (!isR2Configured()) return null;
  const result = await getClient().send(new GetObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: key,
  }));
  if (!result.Body) return null;
  const buf = await result.Body.transformToByteArray();
  return { body: buf, contentType: result.ContentType ?? 'application/octet-stream' };
}

export async function deleteFile(key: string): Promise<void> {
  if (_binding) {
    await _binding.delete(key);
    return;
  }
  if (!isR2Configured()) return;
  await getClient().send(new DeleteObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: key,
  }));
}
