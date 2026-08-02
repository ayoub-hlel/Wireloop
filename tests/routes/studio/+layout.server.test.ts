import { describe, it, expect } from "vitest";
import { load } from "@/routes/studio/+layout.server";

// WL-002: the studio server gate must distinguish a plain logged-out user from
// an auth-factory config error, and signal the latter in the redirect so the
// login page can explain it instead of silently bouncing.
const makeEvent = (locals: Record<string, unknown>) =>
  ({
    locals: { session: null, user: null, ...locals },
    url: new URL("http://localhost:5173/studio"),
    platform: undefined,
  }) as unknown as Parameters<typeof load>[0];

const catchRedirect = async (fn: () => Promise<unknown>) => {
  try {
    await fn();
    return null;
  } catch (e) {
    return e as { status?: number; location?: string };
  }
};

describe("studio +layout.server gate (WL-002)", () => {
  it("redirects to /login (no signal) when the user is simply not logged in", async () => {
    const e = await catchRedirect(() => load(makeEvent({})));
    expect(e?.status).toBe(302);
    expect(e?.location).toBe("/login");
  });

  it("redirects to /login?reason=auth-unavailable when the auth factory is broken", async () => {
    const e = await catchRedirect(() =>
      load(makeEvent({ authError: "auth-unavailable" }))
    );
    expect(e?.status).toBe(302);
    expect(e?.location).toBe("/login?reason=auth-unavailable");
  });

  it("does not redirect when a session exists", async () => {
    const result = await load(
      makeEvent({ session: { id: "s1" }, user: { id: "u1" } })
    );
    expect(result).toBeUndefined();
  });
});
