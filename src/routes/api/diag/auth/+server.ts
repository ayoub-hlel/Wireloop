import { neon } from '@neondatabase/serverless';
import { env } from '$env/dynamic/private';

type Step = { status: 'ok' | 'error'; detail: unknown };

export async function GET() {
  const diag: Record<string, Step> = {};

  // ── 1. Environment variables ─────────────────────────────────
  const dbUrl = env.DATABASE_URL;
  const secret = env.BETTER_AUTH_SECRET;
  const resendKey = env.RESEND_API_KEY;

  diag.env = {
    status: 'ok',
    detail: {
      DATABASE_URL: dbUrl ? `${dbUrl.slice(0, 25)}…` : '❌ MISSING',
      BETTER_AUTH_SECRET: secret ? `${secret.slice(0, 10)}…` : '❌ MISSING',
      RESEND_API_KEY: resendKey ? `${resendKey.slice(0, 10)}…` : '❌ MISSING',
    },
  };

  if (!dbUrl) {
    diag.summary = { status: 'error', detail: 'DATABASE_URL not set — cannot proceed' };
    return json(diag, 500);
  }

  // ── 2. Create neon HTTP client ─────────────────────────────────
  let sql: ReturnType<typeof neon>;
  try {
    sql = neon(dbUrl);
    diag.neonClient = { status: 'ok', detail: 'neon(client) OK — no I/O yet' };
  } catch (e: unknown) {
    const err = e as Error;
    diag.neonClient = { status: 'error', detail: { message: err.message, name: err.name } };
    return json(diag, 500);
  }

  // ── 3. Simple SELECT 1 ─────────────────────────────────────────
  try {
    const result = await sql`SELECT 1 as alive`;
    diag.simpleQuery = { status: 'ok', detail: result };
  } catch (e: unknown) {
    const err = e as Error;
    diag.simpleQuery = {
      status: 'error',
      detail: { message: err.message, name: err.name, stack: (err.stack ?? '').split('\n').slice(0, 5) },
    };
  }

  // ── 4. Check auth tables ───────────────────────────────────────
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

  const hasError = Object.values(diag).some(s => s.status === 'error');
  return json(diag, hasError ? 500 : 200);
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
