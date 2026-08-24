/**
 * Integration test DB: real Postgres (pglite WASM) + the project's real
 * drizzle migrations. No mocked queries — handler SQL runs for real, so
 * cross-tenant bugs, FK violations and policy gaps are caught here.
 *
 * Usage:
 *   const { db } = await createIntegrationDb();   // migrated, empty
 *   vi.mock('$lib/db', ...) → getDb returns db
 */
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFileSync } from "fs";
import { resolve } from "path";

import * as auth from "@/lib/db/schema/auth";
import * as projects from "@/lib/db/schema/projects";

const DRIZZLE_DIR = resolve(__dirname, "../../../drizzle");

/**
 * Splits a migration file's SQL into individual statements.
 * Handles `DO $$ ... $$` blocks (semicolons inside must stay together) and
 * keeps ALTER TYPE + subsequent DDL as separate statements — Postgres forbids
 * using a newly added enum value in the same transaction (pglite wraps
 * multi-statement exec calls in one transaction).
 */
function splitStatements(sql: string): string[] {
  const out: string[] = [];
  let current = "";
  let inDollar = false;
  for (const rawLine of sql.split("\n")) {
    const line = rawLine;
    current += line + "\n";
    // toggle dollar-quote state per occurrence ($$ never appears otherwise)
    for (let i = 0; i < line.length - 1; i += 1) {
      if (line[i] === "$" && line[i + 1] === "$") {
        inDollar = !inDollar;
        i += 1;
      }
    }
    const endsStatement = !inDollar && line.trimEnd().endsWith(";");
    if (endsStatement) {
      const trimmed = current.trim();
      if (trimmed) out.push(trimmed);
      current = "";
    }
  }
  const trimmed = current.trim();
  if (trimmed) out.push(trimmed);
  return out;
}

/** Applies migrations in journal order. */
async function migrate(client: PGlite): Promise<void> {
  const journal = JSON.parse(
    readFileSync(resolve(DRIZZLE_DIR, "meta/_journal.json"), "utf-8"),
  );
  for (const entry of journal.entries) {
    const sql = readFileSync(resolve(DRIZZLE_DIR, `${entry.tag}.sql`), "utf-8");
    for (const stmt of splitStatements(sql)) {
      await client.exec(stmt);
    }
  }
}

export interface IntegrationDb {
  client: PGlite;
   
  db: any; // same shape as getDb() return — handlers accept it unchanged
  close: () => Promise<void>;
}

export async function createIntegrationDb(): Promise<IntegrationDb> {
  const client = new PGlite();
  await migrate(client);
  const db = drizzle(client, {
    schema: { ...auth, ...projects },
  });
  return {
    client,
    db,
    close: () => client.close(),
  };
}
