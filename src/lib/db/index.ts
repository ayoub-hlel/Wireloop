/**
 * Drizzle client for Neon Postgres.
 * Lazy init — doesn't connect at module import so SvelteKit's postbuild
 * analysis can run without DATABASE_URL in the build environment.
 */
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as auth from './schema/auth';
import * as projects from './schema/projects';
import { env } from '$env/dynamic/private';

let _db: ReturnType<typeof drizzle> | null = null;

/** Get or create the drizzle DB client. Returns null if DATABASE_URL is not set. */
export function getDb() {
  if (_db) {
    console.warn('[DB] getDb — returning cached client');
    return _db;
  }
  const url = env.DATABASE_URL;
  if (!url) {
    console.warn('[DB] getDb — DATABASE_URL missing, returning null');
    return null;
  }
  const sql = neon(url);
  _db = drizzle(sql, { schema: { ...auth, ...projects } });
  console.warn('[DB] getDb — neon http client created');
  return _db;
}

export type DB = ReturnType<typeof getDb>;
