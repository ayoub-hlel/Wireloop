/**
 * Auth test helpers — creates test auth instances.
 */
import { createAuth } from "../../auth-factory";

const TEST_SECRET = "test-secret-at-least-32-chars-long!!";
const TEST_BASE_URL = "http://localhost:5173";

let _counter = 0;

/**
 * Generates a unique email address per test to avoid conflicts
 * when running against a shared database (no NEON_API_KEY).
 */
export function uniqueEmail(prefix = "test") {
  return `${prefix}-${Date.now()}-${++_counter}@example.com`;
}

/**
 * Creates a Better Auth instance for testing.
 * Uses the DATABASE_URL from tests/setup.ts (isolated Neon branch).
 */
export function createTestAuth() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL not set. Ensure tests/setup.ts globalSetup ran.",
    );
  }

  return createAuth({
    databaseUrl,
    secret: TEST_SECRET,
    baseURL: TEST_BASE_URL,
  });
}

/**
 * Signs up a new user and returns the response.
 */
export async function signUp(
  auth: ReturnType<typeof createTestAuth>,
  opts: { email: string; password: string; name: string },
) {
  return auth.api.signUpEmail({
    body: opts,
    headers: new Headers(),
    asResponse: true,
  });
}

/**
 * Signs in a user and returns the response.
 */
export async function signIn(
  auth: ReturnType<typeof createTestAuth>,
  opts: { email: string; password: string },
) {
  return auth.api.signInEmail({
    body: opts,
    headers: new Headers(),
    asResponse: true,
  });
}

/**
 * Gets session from a response's Set-Cookie header.
 */
export async function getSessionFromResponse(
  auth: ReturnType<typeof createTestAuth>,
  response: Response,
) {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) return null;

  const token = setCookie.match(/better-auth.session_token=([^;]+)/)?.[1];
  if (!token) return null;

  return auth.api.getSession({
    headers: new Headers({ cookie: `better-auth.session_token=${token}` }),
    asResponse: true,
  });
}

/**
 * Extracts the session token from a response Set-Cookie header.
 */
export function extractSessionToken(response: Response): string | null {
  const setCookie = response.headers.get("set-cookie");
  return setCookie?.match(/better-auth\.session_token=([^;]+)/)?.[1] ?? null;
}
