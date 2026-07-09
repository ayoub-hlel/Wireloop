import { describe, it, expect } from "vitest";
import { createTestAuth } from "./helpers";

describe("Auth Configuration", () => {
  it("creates auth instance with valid secret", () => {
    const auth = createTestAuth();
    expect(auth).toBeDefined();
    expect(auth.api).toBeDefined();
  });

  it("has password policy configured (min 8 chars)", async () => {
    const auth = createTestAuth();

    try {
      await auth.api.signUpEmail({
        body: {
          email: "policy@example.com",
          password: "Short1!",
          name: "Policy Test",
        },
        headers: new Headers(),
      });
      expect.fail("Expected error for short password");
    } catch (e: unknown) {
      const err = e as { message?: string; body?: { message?: string } };
      expect(err.message || err.body?.message || "").toMatch(/password too short|at least 8/i);
    }
  });
});
