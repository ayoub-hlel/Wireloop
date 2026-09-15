import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');
const DRIZZLE = resolve(ROOT, 'drizzle');
const SCHEMA_DIR = resolve(ROOT, 'src/lib/db/schema');

/**
 * Hard schema-drift guard.
 *
 * The /projects outage was a schema column (`deleted_by`) present in the drizzle
 * schema but absent from every migration — drizzle selects every column, so the
 * drift 500'd every projects query. The narrow check in
 * projects-schema-drift.test.ts guards only that one column; here we guard the
 * whole class: every table, column and enum name declared in the drizzle schema
 * must already exist in the applied migrations. Adding a column/enum/table
 * without a migration now fails this suite, not a live query.
 */
const migrationSql = readdirSync(DRIZZLE)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => readFileSync(resolve(DRIZZLE, f), 'utf8'))
  .join('\n');

const schemaFiles = readdirSync(SCHEMA_DIR).filter((f) => f.endsWith('.ts'));
const schemaSrc = schemaFiles
  .map((f) => readFileSync(resolve(SCHEMA_DIR, f), 'utf8'))
  .join('\n');

const tableNames = [...schemaSrc.matchAll(/pgTable\(\s*['"]([\w]+)['"]\s*,/g)].map((m) => m[1]);
const enumNames = [...schemaSrc.matchAll(/pgEnum\(\s*['"]([\w]+)['"]\s*,\s*\[/g)].map((m) => m[1]);

// Column names: the first string arg of a builder (`text('x')`, `timestamp('x')`, …)
// plus enum-typed columns (`orgMemberRole('role')`, `sharePermission('permission')`, …).
const columnNames = [
  ...schemaSrc.matchAll(
    /\b(?:text|varchar|char|numeric|integer|int|smallint|bigint|serial|boolean|date|time|timestamp|uuid|json|jsonb|real|doublePrecision|interval)\(\s*['"]([A-Za-z_][\w]*)['"]/g,
  ),
  ...schemaSrc.matchAll(
    /\b(?:orgMemberRole|sharePermission|inviteStatus|inviteKind|notificationType)\(\s*['"]([A-Za-z_][\w]*)['"]/g,
  ),
].map((m) => m[1]);

// Identifier presence — migrations mix quoted (`"table"`, drizzle-generated) and
// unquoted (later hand-written) identifiers. A word-boundary match handles both:
// `\bstatus\b` matches `"status"` and `status`, but not `invite_status`.
const present = (name: string): boolean =>
  new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(migrationSql);

describe('schema ↔ migrations — full parity', () => {
  it('finds schema files and migration SQL to compare', () => {
    expect(schemaFiles.length).toBeGreaterThan(0);
    expect(migrationSql.length).toBeGreaterThan(0);
  });

  it('every table declared in the schema exists in a migration', () => {
    const missing = tableNames.filter((t) => !present(t));
    expect(
      missing,
      `tables missing from migrations: ${missing.join(', ')} — run \`pnpm db:generate\``,
    ).toEqual([]);
  });

  it('every enum declared in the schema exists in a migration', () => {
    const missing = enumNames.filter((e) => !present(e));
    expect(
      missing,
      `enums missing from migrations: ${missing.join(', ')} — run \`pnpm db:generate\``,
    ).toEqual([]);
  });

  it('every column declared in the schema exists in a migration', () => {
    const uniqueColumns = [...new Set(columnNames)];
    const missing = uniqueColumns.filter((c) => !present(c));
    expect(
      missing,
      `columns missing from migrations: ${missing.join(', ')} — run \`pnpm db:generate\``,
    ).toEqual([]);
  });
});
