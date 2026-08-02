import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the better-auth client before the store module loads (vitest hoists
// `vi.mock` above static imports). Covers WL-003 regression: signInEmail must
// update the store after a successful sign-in so the login-page redirect guard
// (`login/+page.svelte` $effect on isLoggedIn && !loading) can fire.
const { mockSignInEmail, mockGetSession, mockSignOut } = vi.hoisted(() => ({
  mockSignInEmail: vi.fn(),
  mockGetSession: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock("$lib/client/auth-client", () => ({
  authClient: {
    signIn: { email: mockSignInEmail, social: vi.fn() },
    signUp: { email: vi.fn() },
    getSession: mockGetSession,
    signOut: mockSignOut,
    verifyEmail: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    sendVerificationEmail: vi.fn(),
  },
}));

vi.mock("@sentry/sveltekit", () => ({
  setUser: vi.fn(),
  captureException: vi.fn(),
}));

import authStore from "@/stores/auth.store";

const readState = () => {
  let state: unknown;
  authStore.subscribe((v) => (state = v))();
  return state;
};

const sessionData = {
  user: { id: "u1", email: "a@b.c", name: "A" },
  session: { id: "s1", userId: "u1", expiresAt: new Date() },
};

describe("authStore.signInEmail", () => {
  beforeEach(() => {
    mockSignInEmail.mockReset();
    mockGetSession.mockReset();
    authStore.reset();
  });

  it("updates the store to logged-in after a successful email sign-in", async () => {
    mockSignInEmail.mockResolvedValue({ error: null });
    mockGetSession.mockResolvedValue({ data: sessionData });

    await authStore.signInEmail("a@b.c", "pw");

    const s = readState();
    expect(s.isLoggedIn).toBe(true);
    expect(s.uid).toBe("u1");
    expect(s.user?.id).toBe("u1");
    expect(s.session?.id).toBe("s1");
    expect(s.loading).toBe(false);
    // The redirect guard in login/+page.svelte fires exactly on this transition
    expect(s.isLoggedIn && !s.loading).toBe(true);
  });

  it("throws and stays logged out when sign-in returns an error", async () => {
    mockSignInEmail.mockResolvedValue({
      error: { message: "invalid credentials", statusText: "401" },
    });
    mockGetSession.mockResolvedValue({ data: null });

    await expect(authStore.signInEmail("a@b.c", "bad")).rejects.toThrow(
      "invalid credentials"
    );

    const s = readState();
    expect(s.isLoggedIn).toBe(false);
    expect(s.loading).toBe(true); // untouched by the failed sign-in
  });

  it("stays logged out if the session fetch fails after sign-in", async () => {
    mockSignInEmail.mockResolvedValue({ error: null });
    mockGetSession.mockRejectedValue(new Error("network"));

    await authStore.signInEmail("a@b.c", "pw");

    const s = readState();
    expect(s.isLoggedIn).toBe(false);
    expect(s.loading).toBe(false); // init() catches and clears loading
  });
});

// WL-007: root and studio layouts both call init()/set() on mount. init() must
// be idempotent (one session fetch) while still allowing explicit refresh.
describe("authStore.init idempotency (WL-007)", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    authStore.reset();
  });

  it("fetches the session only once across repeated init() calls", async () => {
    mockGetSession.mockResolvedValue({ data: null });
    await authStore.init();
    await authStore.init();
    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });

  it("init(true) forces a refresh even after the store is initialized", async () => {
    mockGetSession.mockResolvedValue({ data: null });
    await authStore.init();
    await authStore.init(true);
    expect(mockGetSession).toHaveBeenCalledTimes(2);
  });

  it("init() no-ops after the store is set externally (server-session path)", async () => {
    mockGetSession.mockResolvedValue({ data: null });
    authStore.set({
      isLoggedIn: true,
      uid: "u1",
      user: null,
      session: null,
      loading: false,
    });
    await authStore.init();
    expect(mockGetSession).not.toHaveBeenCalled();
  });
});
