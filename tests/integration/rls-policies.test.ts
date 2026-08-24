/**
 * Verifies the DB-level security controls from migration 0006:
 *
 * 1. audit_log is append-only AT THE DATABASE LEVEL (trigger blocks
 *    UPDATE/DELETE even for the table owner).
 * 2. RLS policies are dormant for owner-role connections (no behavior change)
 *    but enforce tenant isolation once `app.user_id` is set per-transaction —
 *    proving the safety net works when the data layer moves to a
 *    session-scoped driver.
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { IntegrationDb } from './helpers/db.helper';

let intDb: IntegrationDb;

beforeAll(async () => {
  intDb = await (await import('./helpers/db.helper')).createIntegrationDb();
}, 60_000);

afterAll(async () => {
  await intDb?.close();
});

describe('audit_log append-only enforcement (DB trigger)', () => {
  const id = 'audit-test-row';

  it('accepts inserts', async () => {
    await intDb.client.exec(
      `INSERT INTO audit_log (id, actor_user_id, action) VALUES ('${id}', NULL, 'test:action')`,
    );
    const r = await intDb.client.query(`SELECT action FROM audit_log WHERE id = '${id}'`);
    expect(r.rows[0]?.action).toBe('test:action');
  });

  it('rejects UPDATE even from the table owner', async () => {
    await expect(
      intDb.client.exec(`UPDATE audit_log SET action = 'tampered' WHERE id = '${id}'`),
    ).rejects.toThrow(/append-only/i);
  });

  it('rejects DELETE even from the table owner', async () => {
    await expect(
      intDb.client.exec(`DELETE FROM audit_log WHERE id = '${id}'`),
    ).rejects.toThrow(/append-only/i);
  });
});

describe('row-level security policies', () => {
  beforeAll(async () => {
    // Non-owner runtime role: RLS only binds non-owner roles (until FORCE),
    // which mirrors exactly how the policies will behave in production once a
    // session-scoped driver runs requests as a restricted role.
    await intDb.client.exec(`
      DO $$ BEGIN
        CREATE ROLE app_runtime;
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      GRANT USAGE ON SCHEMA public TO app_runtime;
      GRANT ALL ON ALL TABLES IN SCHEMA public TO app_runtime;
    `);
    // Two tenants, one private project each.
    await intDb.client.exec(`
      INSERT INTO "user" (id, name, email, created_at, updated_at) VALUES
        ('rls-alice', 'Alice', 'rls-alice@test.dev', now(), now()),
        ('rls-bob', 'Bob', 'rls-bob@test.dev', now(), now())
      ON CONFLICT DO NOTHING;
    `);
    await intDb.client.exec(`
      INSERT INTO projects (id, user_id, name, workspace, board_type, is_public, tags, likes, views, created_at, updated_at)
      VALUES ('proj-alice', 'rls-alice', 'A', '<a/>', 'uno', false, '{}'::text[], 0, 0, now(), now()),
             ('proj-bob', 'rls-bob', 'B', '<b/>', 'uno', false, '{}'::text[], 0, 0, now(), now());
    `);
  });

  it('is dormant for plain owner-role queries (no behavior change)', async () => {
    const r = await intDb.client.query(`SELECT count(*)::int AS n FROM projects`);
    expect(r.rows[0].n).toBe(2);
  });

  it('restricts visibility to app.user_id within a transaction', async () => {
    const seen = await intDb.client.transaction(async (tx) => {
      await tx.exec(`SET LOCAL ROLE app_runtime`);
      await tx.exec(`SELECT set_config('app.user_id', 'rls-alice', true)`);
      return (await tx.query(`SELECT id FROM projects ORDER BY id`)).rows.map((r) => r.id);
    });
    expect(seen).toEqual(['proj-alice']);
  });

  it('gives a different tenant a different view', async () => {
    const seen = await intDb.client.transaction(async (tx) => {
      await tx.exec(`SET LOCAL ROLE app_runtime`);
      await tx.exec(`SELECT set_config('app.user_id', 'rls-bob', true)`);
      return (await tx.query(`SELECT id FROM projects ORDER BY id`)).rows.map((r) => r.id);
    });
    expect(seen).toEqual(['proj-bob']);
  });

  it('denies everything when no tenant is set inside a transaction', async () => {
    const seen = await intDb.client.transaction(async (tx) => {
      await tx.exec(`SET LOCAL ROLE app_runtime`);
      return (await tx.query(`SELECT id FROM projects`)).rows.length;
    });
    expect(seen).toBe(0);
  });

  it('RLS also blocks cross-tenant writes within a transaction', async () => {
    await expect(
      intDb.client.transaction(async (tx) => {
        await tx.exec(`SET LOCAL ROLE app_runtime`);
        await tx.exec(`SELECT set_config('app.user_id', 'rls-bob', true)`);
        await tx.exec(`UPDATE projects SET name = 'stolen' WHERE id = 'proj-alice'`);
      }),
    ).resolves.toBeUndefined(); // update silently affects 0 rows under RLS
    const name = await intDb.client.query(`SELECT name FROM projects WHERE id = 'proj-alice'`);
    expect(name.rows[0].name).toBe('A'); // untouched
  });
});
