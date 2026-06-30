// ponytail: thin R2 wrapper — Cloudflare binding preferred, S3 env-var fallback
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// ponytail: global lock, per-account locks if throughput matters
let _binding: any = null;

/** Call from hooks.server.ts to inject the Cloudflare R2 binding from platform.env.R2 */
export function setR2Binding(binding: any) {
  _binding = binding;
}

function getClient() {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT || '',
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY || '', secretAccessKey: process.env.R2_SECRET_KEY || '' },
    requestChecksumCalculation: 'WHEN_REQUIRED',
  });
}

export function isR2Configured(): boolean {
  if (_binding) return true;
  return !!(process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY && process.env.R2_SECRET_KEY && process.env.R2_BUCKET);
}

export async function putFile(key: string, content: string, contentType: string): Promise<void> {
  if (_binding) {
    await _binding.put(key, content, { httpMetadata: { contentType } });
    return;
  }
  if (!isR2Configured()) throw new Error('R2 not configured');
  await getClient().send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: content,
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
    Bucket: process.env.R2_BUCKET,
    Key: key,
  }));
  return await result.Body?.transformToString() ?? null;
}

export async function deleteFile(key: string): Promise<void> {
  if (_binding) {
    await _binding.delete(key);
    return;
  }
  if (!isR2Configured()) return;
  await getClient().send(new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
  }));
}
