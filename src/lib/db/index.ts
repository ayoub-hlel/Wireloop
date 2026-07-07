/**
 * Drizzle client for Neon Postgres.
 * Lazy init — doesn't connect at module import so SvelteKit's postbuild
 * analysis can run without DATABASE_URL in the build environment.
 */
import { drizzle } from 'drizzle-orm/neon-http';
import { neon, neonConfig } from '@neondatabase/serverless';
import * as auth from './schema/auth';
import * as projects from './schema/projects';
import { env } from '$env/dynamic/private';

neonConfig.fetchConnectionCache = true;

let _db: ReturnType<typeof drizzle> | null = null;

/** Get or create the drizzle DB client. Returns null if DATABASE_URL is not set. */
export function getDb() {
  if (!_db) {
    const url = env.DATABASE_URL;
    if (!url) return null;
    _db = drizzle(neon(url), { schema: { ...auth, ...projects } });
  }
  return _db;
}

export type DB = ReturnType<typeof getDb>;
