import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getDb } from '$lib/db';
import * as authSchema from '$lib/db/schema/auth';
import { getAuth } from '$lib/server/auth';
import { sql } from 'drizzle-orm';
import type { AnyPgTable } from 'drizzle-orm/pg-core';

const ENV_VARS = [
  'DATABASE_URL',
  'BETTER_AUTH_SECRET',
  'RESEND_API_KEY',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
] as const;

export async function GET() {
  console.warn('[DIAG] GET entry');
  const checks: Record<string, unknown> = {};

  checks.env = checkEnv();
  checks.database = await checkDatabase();
  checks.auth = checkAuth();
  checks.email = checkEmail();
  checks.oauth = checkOAuth();
  checks.password_rules = {
    status: 'ok',
    minLength: 8,
    maxLength: 128,
    requireLowercase: true,
    requireUppercase: true,
    requireDigit: true,
    requireSpecialChar: true,
  };

  const allChecks = Object.values(checks) as Array<{ status: string }>;
  const total = allChecks.length;
  const passed = allChecks.filter(c => c.status === 'ok').length;
  const failed = allChecks.filter(c => c.status === 'fail').length;
  const warnings = allChecks.filter(c => c.status === 'degraded' || c.status === 'untested').length;

  const overallStatus = failed > 0 ? 'down' : warnings > 0 ? 'degraded' : 'ok';
  console.warn('[DIAG] overall status', { status: overallStatus, total, passed, failed, warnings });

  return json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    environment: env.CF_PAGES_BRANCH ?? 'development',
    checks,
    summary: { total, passed, failed, warnings },
  });
}

function checkEnv() {
  const vars: Record<string, string> = {};
  let missing = 0;

  for (const key of ENV_VARS) {
    if (env[key]) {
      vars[key] = 'set';
    } else {
      vars[key] = 'missing';
      missing++;
    }
  }

  return {
    status: missing === 0 ? 'ok' : missing === ENV_VARS.length ? 'fail' : 'degraded',
    vars,
    ...(missing > 0
      ? { note: `${missing} var(s) missing — core vars break auth, OAuth vars only affect social login` }
      : {}),
  };
}

async function checkDatabase() {
  const db = getDb();
  if (!db) {
    return { status: 'fail', error: 'Database client not available (DATABASE_URL missing?)', tables: null };
  }

  const tables: Record<string, AnyPgTable> = {
    user: authSchema.user,
    session: authSchema.session,
    account: authSchema.account,
    verification: authSchema.verification,
  };

  let latency: string | null;
  try {
    const start = performance.now();
    await db.execute(sql`SELECT 1 AS ok`);
    latency = `${(performance.now() - start).toFixed(1)}ms`;
  } catch (e) {
    return {
      status: 'fail',
      error: e instanceof Error ? e.message : 'Database connection failed',
      tables: null,
      latency: null,
    };
  }

  const tableResults: Record<string, string> = {};
  let tableFailures = 0;

  for (const [name, schema] of Object.entries(tables)) {
    const start = performance.now();
    try {
      await db.select({ count: sql<number>`count(*)::int` }).from(schema);
      tableResults[name] = `${(performance.now() - start).toFixed(1)}ms`;
    } catch {
      tableFailures++;
      tableResults[name] = 'error';
    }
  }

  return {
    status: tableFailures === 0 ? 'ok' : 'degraded',
    latency,
    tables: tableResults,
    ...(tableFailures > 0
      ? { note: `${tableFailures} table(s) unreachable — schema may be out of sync` }
      : {}),
  };
}

function checkAuth() {
  try {
    const auth = getAuth();
    if (!auth) {
      return {
        status: 'fail',
        error: 'Auth instance is null — missing DATABASE_URL or BETTER_AUTH_SECRET',
      };
    }
    return {
      status: 'ok',
      basePath: '/api/auth',
      emailVerification: true,
      passwordReset: true,
      sveltekitPlugin: true,
      allowedHosts: [
        'https://wire-loop.tech',
        'https://www.wire-loop.tech',
        'https://*.pages.dev',
      ],
    };
  } catch (e) {
    return { status: 'fail', error: e instanceof Error ? e.message : 'Auth creation threw' };
  }
}

function checkEmail() {
  if (!env.RESEND_API_KEY) {
    return { status: 'fail', provider: 'Resend', error: 'RESEND_API_KEY not set' };
  }
  return {
    status: 'ok',
    provider: 'Resend',
    from: 'Wireloop <noreply@wire-loop.tech>',
  };
}

function checkOAuth() {
  const providers: Record<string, string> = {};
  let configured = 0;

  const ghId = !!env.GITHUB_CLIENT_ID;
  const ghSecret = !!env.GITHUB_CLIENT_SECRET;
  providers.github = ghId && ghSecret ? 'configured' : ghId !== ghSecret ? 'partial' : 'missing';
  if (providers.github === 'configured') configured++;

  const gId = !!env.GOOGLE_CLIENT_ID;
  const gSecret = !!env.GOOGLE_CLIENT_SECRET;
  providers.google = gId && gSecret ? 'configured' : gId !== gSecret ? 'partial' : 'missing';
  if (providers.google === 'configured') configured++;

  return {
    status: configured > 0 ? 'ok' : 'degraded',
    providers,
    note:
      configured === 0
        ? 'No OAuth providers fully configured — social login will fail until both CLIENT_ID and CLIENT_SECRET are set per provider'
        : `${configured} provider(s) ready`,
  };
}
