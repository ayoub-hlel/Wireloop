import { describe, it, expect } from "vitest";
import { load as rootLoad } from "@/routes/+page.server";
import { load as loginLoad } from "@/routes/login/+page.server";

const makeEvent = (locals: Record<string, unknown>, pathname = "/") =>
  ({
    locals: { session: null, user: null, ...locals },
    url: new URL(`http://localhost:5173${pathname}`),
    platform: undefined,
  }) as unknown as Parameters<typeof rootLoad>[0] & Parameters<typeof loginLoad>[0];

const catchRedirect = async (fn: () => Promise<unknown>) => {
  try {
    await fn();
    return null;
  } catch (e) {
    return e as { status?: number; location?: string };
  }
};

describe("auth redirect guards (bucket 12)", () => {
  it("root / redirects to /projects when a session exists", async () => {
    const e = await catchRedirect(() =>
      rootLoad(makeEvent({ session: { id: "s1" }, user: { id: "u1" } }))
    );
    expect(e?.status).toBe(302);
    expect(e?.location).toBe("/projects");
  });

  it("root / renders the landing page when logged out", async () => {
    const result = await rootLoad(makeEvent({}));
    expect(result).toBeUndefined();
  });

  it("/login redirects to /projects when a session exists", async () => {
    const e = await catchRedirect(() =>
      loginLoad(
        makeEvent({ session: { id: "s1" }, user: { id: "u1" } }, "/login")
      )
    );
    expect(e?.status).toBe(302);
    expect(e?.location).toBe("/projects");
  });

  it("/login renders the login form when logged out", async () => {
    const result = await loginLoad(makeEvent({}, "/login"));
    expect(result).toBeUndefined();
  });
});
