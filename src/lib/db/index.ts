/**
 * Drizzle client for Neon Postgres.
 * Single source of truth — used by stores, Better Auth, and Workers.
 */
import { drizzle } from 'drizzle-orm/neon-http';
import { neon, neonConfig } from '@neondatabase/serverless';
import * as auth from './schema/auth';
import * as projects from './schema/projects';

const DATABASE_URL = process.env.DATABASE_URL!;

// Neon is HTTP-first — no persistent connection needed on serverless
neonConfig.fetchConnectionCache = true;

const sql = neon(DATABASE_URL);

export const db = drizzle(sql, {
  schema: { ...auth, ...projects },
});

export type DB = typeof db;
