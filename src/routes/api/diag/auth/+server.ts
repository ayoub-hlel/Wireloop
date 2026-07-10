import { neon } from '@neondatabase/serverless';
import { env } from '$env/dynamic/private';
import { drizzle } from 'drizzle-orm/neon-http';
import { createAuth } from '$lib/server/auth-factory.js';

type Step = { status: 'ok' | 'error'; detail: unknown };

export async function GET() {
  const diag: Record<string, Step> = {};

  const dbUrl = env.DATABASE_URL;
  const secret = env.BETTER_AUTH_SECRET;
  const resendKey = env.RESEND_API_KEY;

  diag.env = {
    status: 'ok',
    detail: {
      DATABASE_URL: dbUrl ? `${dbUrl.slice(0, 25)}…` : 'MISSING',
      BETTER_AUTH_SECRET: secret ? `${secret.slice(0, 10)}…` : 'MISSING',
      RESEND_API_KEY: resendKey ? `${resendKey.slice(0, 10)}…` : 'MISSING',
    },
  };

  if (!dbUrl) {
    return json(diag, 500);
  }

  let sql: ReturnType<typeof neon>;
  try {
    sql = neon(dbUrl);
    diag.neonClient = { status: 'ok', detail: 'neon(client) OK' };
  } catch (e: unknown) {
    const err = e as Error;
    diag.neonClient = { status: 'error', detail: { message: err.message, name: err.name } };
    return json(diag, 500);
  }

  try {
    const result = await sql`SELECT 1 as alive`;
    diag.simpleQuery = { status: 'ok', detail: result };
  } catch (e: unknown) {
    const err = e as Error;
    diag.simpleQuery = { status: 'error', detail: { message: err.message, name: err.name, stack: (err.stack ?? '').split('\n').slice(0, 5) } };
  }

  try {
    const tables = await sql`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    diag.tables = { status: 'ok', detail: tables };
  } catch (e: unknown) {
    const err = e as Error;
    diag.tables = { status: 'error', detail: { message: err.message, name: err.name } };
  }

  try {
    const result = await sql`INSERT INTO "user" (email, email_verified, name) VALUES ('diag-write-test@test.com', false, 'Diag Write Test') RETURNING id`;
    diag.writeTest = { status: 'ok', detail: result };
    await sql`DELETE FROM "user" WHERE email = 'diag-write-test@test.com'`;
  } catch (e: unknown) {
    const err = e as Error;
    diag.writeTest = { status: 'error', detail: { message: err.message, name: err.name, stack: (err.stack ?? '').split('\n').slice(0, 5) } };
  }

  try {
    const db = drizzle(neon(dbUrl));
    diag.drizzleInit = { status: 'ok', detail: 'drizzle(client) OK' };
  } catch (e: unknown) {
    const err = e as Error;
    diag.drizzleInit = { status: 'error', detail: { message: err.message, name: err.name } };
  }

  try {
    const auth = createAuth({
      databaseUrl: dbUrl,
      secret: secret ?? 'fallback-secret',
      baseURL: 'https://wireloop.pages.dev',
    });
    diag.authInit = { status: 'ok', detail: 'createAuth() returned without throwing' };
  } catch (e: unknown) {
    const err = e as Error;
    diag.authInit = { status: 'error', detail: { message: err.message, name: err.name, stack: (err.stack ?? '').split('\n').slice(0, 5) } };
  }

  const hasError = Object.values(diag).some(s => s.status === 'error');
  return json(diag, hasError ? 500 : 200);
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
