// ponytail: thin S3 wrapper over Cloudflare R2
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const R2_ENDPOINT = process.env.R2_ENDPOINT || '';
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY || '';
const R2_SECRET_KEY = process.env.R2_SECRET_KEY || '';
const R2_BUCKET = process.env.R2_BUCKET || '';

function getClient() {
  return new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
    requestChecksumCalculation: 'WHEN_REQUIRED',
  });
}

export function isR2Configured(): boolean {
  return !!(R2_ENDPOINT && R2_ACCESS_KEY && R2_SECRET_KEY && R2_BUCKET);
}

export async function putFile(key: string, content: string, contentType: string): Promise<void> {
  if (!isR2Configured()) throw new Error('R2 not configured');
  const client = getClient();
  await client.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: content,
    ContentType: contentType,
  }));
}

export async function getFile(key: string): Promise<string | null> {
  if (!isR2Configured()) return null;
  const client = getClient();
  const result = await client.send(new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  }));
  return await result.Body?.transformToString() ?? null;
}

export async function deleteFile(key: string): Promise<void> {
  if (!isR2Configured()) return;
  const client = getClient();
  await client.send(new DeleteObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  }));
}
