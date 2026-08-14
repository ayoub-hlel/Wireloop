import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');
const DRIZZLE = resolve(ROOT, 'drizzle');

/**
 * Regression for the /projects outage (~560 Sentry events).
 *
 * Root cause: migration 0005 was never applied because it wrote
 * `REFERENCES user(id)` — `user` is a Postgres reserved word and must be
 * quoted, so the migration aborted on its first statement. The schema then
 * drifted from the DB and every projects query 500'd with
 * `column projects.deleted_by does not exist`, surfacing to users as an
 * opaque "Illegal invocation".
 *
 * These guard the *cause*, not the symptom: any migration referencing the
 * reserved-word table unquoted would repeat the outage.
 */
describe('migrations — reserved-word identifiers are quoted', () => {
  const sqlFiles = readdirSync(DRIZZLE).filter(f => f.endsWith('.sql'));

  it('finds migration files to check', () => {
    expect(sqlFiles.length).toBeGreaterThan(0);
  });

  for (const file of sqlFiles) {
    it(`${file} never references the reserved-word "user" table unquoted`, () => {
      const sql = readFileSync(resolve(DRIZZLE, file), 'utf8');
      // Matches REFERENCES user(...) / REFERENCES public.user(...) but not "user".
      const unquoted = sql.match(/REFERENCES\s+(?:public\.)?user\s*\(/gi);
      expect(unquoted, `unquoted reserved word in ${file}: ${unquoted?.join(', ')}`).toBeNull();
    });
  }
});

describe('schema/migration parity for the columns that broke /projects', () => {
  const schema = readFileSync(resolve(ROOT, 'src/lib/db/schema/projects.ts'), 'utf8');
  const migration = readFileSync(resolve(DRIZZLE, '0005_project_page_api.sql'), 'utf8');

  // Drizzle selects every column in the schema, so a column present in the
  // schema but absent from all migrations means a guaranteed runtime 500.
  for (const col of ['deleted_by', 'is_forked']) {
    it(`projects.${col} exists in the schema and in a migration`, () => {
      expect(schema).toContain(`'${col}'`);
      expect(migration).toContain(col);
    });
  }
});
