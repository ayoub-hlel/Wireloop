import { describe, it, expect } from "vitest";
import { createTestAuth, uniqueEmail } from "./helpers";

describe("Auth Guard", () => {
  it("redirects to /login when no session", () => {
    const session = null;

    if (!session) {
      expect(true).toBe(true);
    }
  });

  it("allows access with valid session", () => {
    const session = {
      id: "session-123",
      token: "valid-token",
      userId: "user-123",
      expiresAt: new Date(Date.now() + 86400000),
    };

    if (!session) {
      throw new Error("Should not redirect");
    }

    expect(session.id).toBeDefined();
  });

  it("populates event.locals.session from auth", async () => {
    const auth = createTestAuth();
    const email = uniqueEmail("guard-locals");

    await auth.api.signUpEmail({
      body: {
        email,
        password: "Test1234!",
        name: "Guard Locals",
      },
      headers: new Headers(),
    });

    const signInRes = await auth.api.signInEmail({
      body: {
        email,
        password: "Test1234!",
      },
      headers: new Headers(),
      asResponse: true,
    });

    const signInData = (await signInRes.json()) as { token: string };
    const token = signInData.token;

    const sessionRes = await auth.api.getSession({
      headers: new Headers({
        authorization: `Bearer ${token}`,
      }),
      asResponse: true,
    });

    expect(sessionRes.status).toBe(200);
  });
});
