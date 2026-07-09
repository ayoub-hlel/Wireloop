import { describe, it, expect } from "vitest";
import { createTestAuth, uniqueEmail } from "./helpers";

describe("Sign-In", () => {
  it("returns session with correct credentials", async () => {
    const auth = createTestAuth();
    const email = uniqueEmail("signin-valid");

    await auth.api.signUpEmail({
      body: {
        email,
        password: "Test1234!",
        name: "Sign In Valid",
      },
      headers: new Headers(),
    });

    const res = await auth.api.signInEmail({
      body: {
        email,
        password: "Test1234!",
      },
      headers: new Headers(),
      asResponse: true,
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as { user: { email: string }; token: string };
    expect(data.user.email).toBe(email);
    expect(data.token).toBeDefined();
  });

  it("rejects wrong password", async () => {
    const auth = createTestAuth();
    const email = uniqueEmail("signin-wrong");

    await auth.api.signUpEmail({
      body: {
        email,
        password: "Test1234!",
        name: "Wrong Password",
      },
      headers: new Headers(),
    });

    try {
      await auth.api.signInEmail({
        body: {
          email,
          password: "WrongPassword1!",
        },
        headers: new Headers(),
      });
      expect.fail("Expected 401 for wrong password");
    } catch (e: unknown) {
      const err = e as { message?: string; status?: number; statusCode?: number; body?: { status?: number } };
      const status = err.status ?? err.statusCode ?? err.body?.status ?? err.message;
      expect(String(status).toLowerCase()).toMatch(/unauthorized|401/);
    }
  });

  it("rejects nonexistent email", async () => {
    const auth = createTestAuth();
    const email = uniqueEmail("nonexistent");

    try {
      await auth.api.signInEmail({
        body: {
          email,
          password: "Test1234!",
        },
        headers: new Headers(),
      });
      expect.fail("Expected error for nonexistent email");
    } catch (e: unknown) {
      const err = e as { message?: string; status?: number; statusCode?: number; body?: { status?: number } };
      const status = err.status ?? err.statusCode ?? err.body?.status ?? err.message;
      expect(String(status).toLowerCase()).toMatch(/unauthorized|401/);
    }
  });
});
