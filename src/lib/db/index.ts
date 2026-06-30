/**
 * Drizzle client for Neon Postgres.
 * Lazy init — doesn't connect at module import so SvelteKit's postbuild
 * analysis can run without DATABASE_URL in the build environment.
 */
import { drizzle } from 'drizzle-orm/neon-http';
import { neon, neonConfig } from '@neondatabase/serverless';
import * as auth from './schema/auth';
import * as projects from './schema/projects';

neonConfig.fetchConnectionCache = true;

let _db: ReturnType<typeof drizzle> | null = null;

/** Get or create the drizzle DB client. Throws if DATABASE_URL is not set. */
export function getDb() {
  if (!_db) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');
    _db = drizzle(neon(process.env.DATABASE_URL), { schema: { ...auth, ...projects } });
  }
  return _db;
}

export type DB = ReturnType<typeof getDb>;
