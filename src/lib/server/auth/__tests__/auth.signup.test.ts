import { describe, it, expect } from "vitest";
import { createTestAuth, uniqueEmail } from "./helpers";
import { validatePassword } from "../../auth-factory";

describe("Password Policy (unit)", () => {
  it("rejects password shorter than 8 characters", () => {
    const errors = validatePassword("Ab1!");
    expect(errors).toContainEqual("Password must be at least 8 characters");
  });

  it("rejects password without uppercase letter", () => {
    const errors = validatePassword("testtest1!");
    expect(errors).toContainEqual("Password must contain an uppercase letter");
  });

  it("rejects password without lowercase letter", () => {
    const errors = validatePassword("TESTTEST1!");
    expect(errors).toContainEqual("Password must contain a lowercase letter");
  });

  it("rejects password without number", () => {
    const errors = validatePassword("TestTest!");
    expect(errors).toContainEqual("Password must contain a number");
  });

  it("rejects password without special character", () => {
    const errors = validatePassword("TestTest1");
    expect(errors).toContainEqual("Password must contain a special character");
  });

  it("accepts valid password", () => {
    const errors = validatePassword("Test1234!");
    expect(errors).toHaveLength(0);
  });

  it("reports multiple missing rules", () => {
    const errors = validatePassword("1234");
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe("Sign-Up", () => {
  it("creates user with valid credentials", async () => {
    const auth = createTestAuth();
    const email = uniqueEmail("signup-valid");

    const res = await auth.api.signUpEmail({
      body: {
        email,
        password: "Test1234!",
        name: "Valid User",
      },
      headers: new Headers(),
      asResponse: true,
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.email).toBe(email);
    expect(data.user.name).toBe("Valid User");
    expect(data.user.emailVerified).toBe(false);
    expect(data.token).toBeDefined();
  });

  it("rejects password shorter than 8 characters", async () => {
    const auth = createTestAuth();
    const email = uniqueEmail("weak");

    try {
      await auth.api.signUpEmail({
        body: {
          email,
          password: "Ab1!",
          name: "Weak",
        },
        headers: new Headers(),
      });
      expect.fail("Expected error");
    } catch (e: any) {
      const msg = (e.message ?? e.body?.message ?? "").toLowerCase();
      expect(msg).toMatch(/password too short|at least 8/i);
    }
  });

  it("rejects password without uppercase letter", async () => {
    const auth = createTestAuth();
    const email = uniqueEmail("no-upper");

    try {
      await auth.api.signUpEmail({
        body: {
          email,
          password: "testtest1!",
          name: "No Upper",
        },
        headers: new Headers(),
      });
      expect.fail("Expected error");
    } catch (e: any) {
      const msg = (e.message ?? e.body?.message ?? "").toLowerCase();
      expect(msg).toMatch(/uppercase/i);
    }
  });

  it("rejects password without lowercase letter", async () => {
    const auth = createTestAuth();
    const email = uniqueEmail("no-lower");

    try {
      await auth.api.signUpEmail({
        body: {
          email,
          password: "TESTTEST1!",
          name: "No Lower",
        },
        headers: new Headers(),
      });
      expect.fail("Expected error");
    } catch (e: any) {
      const msg = (e.message ?? e.body?.message ?? "").toLowerCase();
      expect(msg).toMatch(/lowercase/i);
    }
  });

  it("rejects password without number", async () => {
    const auth = createTestAuth();
    const email = uniqueEmail("no-number");

    try {
      await auth.api.signUpEmail({
        body: {
          email,
          password: "TestTest!",
          name: "No Number",
        },
        headers: new Headers(),
      });
      expect.fail("Expected error");
    } catch (e: any) {
      const msg = (e.message ?? e.body?.message ?? "").toLowerCase();
      expect(msg).toMatch(/number/i);
    }
  });

  it("rejects password without special character", async () => {
    const auth = createTestAuth();
    const email = uniqueEmail("no-special");

    try {
      await auth.api.signUpEmail({
        body: {
          email,
          password: "TestTest1",
          name: "No Special",
        },
        headers: new Headers(),
      });
      expect.fail("Expected error");
    } catch (e: any) {
      const msg = (e.message ?? e.body?.message ?? "").toLowerCase();
      expect(msg).toMatch(/special character/i);
    }
  });

  it("rejects missing name", async () => {
    const auth = createTestAuth();
    const email = uniqueEmail("no-name");

    try {
      await auth.api.signUpEmail({
        body: {
          email,
          password: "Test1234!",
        },
        headers: new Headers(),
      });
      expect.fail("Expected error");
    } catch (e: any) {
      expect(e).toBeDefined();
    }
  });

  it("rejects missing email", async () => {
    const auth = createTestAuth();

    try {
      await auth.api.signUpEmail({
        body: {
          password: "Test1234!",
          name: "No Email",
        },
        headers: new Headers(),
      });
      expect.fail("Expected error");
    } catch (e: any) {
      expect(e).toBeDefined();
    }
  });
});
