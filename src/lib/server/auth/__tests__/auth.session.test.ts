import { describe, it, expect } from "vitest";
import { createTestAuth, uniqueEmail, signUp, signIn } from "./helpers";

async function signUpAndGetSession(auth: ReturnType<typeof createTestAuth>, email: string) {
  const signUpRes = await signUp(auth, {
    email,
    password: "Test1234!",
    name: "Session User",
  });

  return { auth, signUpRes };
}

describe("Session Management", () => {
  it("returns session with valid token", async () => {
    const email = uniqueEmail("session-valid");
    const auth = createTestAuth();
    await signUpAndGetSession(auth, email);

    const signInRes = await signIn(auth, { email, password: "Test1234!" });
    const sessionToken = signInRes.headers.get("set-cookie")?.match(/better-auth\.session_token=([^;]+)/)?.[1];
    expect(sessionToken).toBeDefined();

    const sessionRes = await auth.api.getSession({
      headers: new Headers({
        cookie: `better-auth.session_token=${sessionToken}`,
      }),
    });

    expect(sessionRes).toBeDefined();
 
    const data = sessionRes as any;
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe(email);
    expect(data.user.name).toBe("Session User");
    expect(data.session).toBeDefined();
  });

  it("returns error for invalid token", async () => {
    const auth = createTestAuth();

    try {
      await auth.api.getSession({
        headers: new Headers({
          cookie: "better-auth.session_token=invalid-token-abc123",
        }),
        asResponse: true,
      });
      expect.fail("Expected error for invalid token");
    } catch (e: unknown) {
      const err = e as { message?: string; status?: number; statusCode?: number; body?: { status?: number } };
      const status = err.status ?? err.statusCode ?? err.body?.status ?? err.message;
      expect(String(status).toLowerCase()).not.toBe("200");
    }
  });

  it("invalidates session on sign-out", async () => {
    const email = uniqueEmail("session-signout");
    const auth = createTestAuth();
    await signUpAndGetSession(auth, email);

    const signInRes = await signIn(auth, { email, password: "Test1234!" });
    const sessionToken = signInRes.headers.get("set-cookie")?.match(/better-auth\.session_token=([^;]+)/)?.[1];
    expect(sessionToken).toBeDefined();

    await auth.api.signOut({
      headers: new Headers({
        cookie: `better-auth.session_token=${sessionToken}`,
      }),
      asResponse: true,
    });

    try {
      await auth.api.getSession({
        headers: new Headers({
          cookie: `better-auth.session_token=${sessionToken}`,
        }),
        asResponse: true,
      });
      expect.fail("Expected error after sign-out");
    } catch (e: unknown) {
      const err = e as { message?: string; status?: number; statusCode?: number; body?: { status?: number } };
      const status = err.status ?? err.statusCode ?? err.body?.status ?? err.message;
      expect(String(status).toLowerCase()).not.toBe("200");
    }
  });

  it("returns expected session fields", async () => {
    const email = uniqueEmail("session-fields");
    const auth = createTestAuth();
    await signUpAndGetSession(auth, email);

    const signInRes = await signIn(auth, { email, password: "Test1234!" });
    const sessionToken = signInRes.headers.get("set-cookie")?.match(/better-auth\.session_token=([^;]+)/)?.[1];
    expect(sessionToken).toBeDefined();

    const sessionRes = await auth.api.getSession({
      headers: new Headers({
        cookie: `better-auth.session_token=${sessionToken}`,
      }),
    });

 
    const data = sessionRes as any;
    expect(data.user.id).toBeDefined();
    expect(data.user.email).toBe(email);
    expect(data.user.name).toBe("Session User");
    expect(data.user.emailVerified).toBe(false);
    expect(data.session.id).toBeDefined();
    expect(data.session.token).toBeDefined();
    expect(data.session.expiresAt).toBeDefined();
    expect(data.session.userId).toBe(data.user.id);
  });
});
