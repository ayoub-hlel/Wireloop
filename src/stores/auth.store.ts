import { writable } from 'svelte/store';
import { authClient } from '$lib/client/auth-client';
import type { Session, User } from 'better-auth';
import * as Sentry from '@sentry/sveltekit';

export interface AuthState {
  isLoggedIn: boolean;
  uid: string | null;
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const initial: AuthState = {
  isLoggedIn: false,
  uid: null,
  user: null,
  session: null,
  loading: true,
};

function createAuthStore() {
  const { subscribe, set } = writable<AuthState>(initial);
  // Guards against double init during boot — the root and studio layouts both
  // call init() on mount (WL-007). signInEmail/verifyEmail pass force=true to
  // refresh after an action.
  let _initialized = false;

  return {
    subscribe,
    set: (state: AuthState) => { _initialized = true; set(state); },

    /** Initialize — fetch session from Better Auth. No-op if already initialized. */
    async init(force = false) {
      if (!force && _initialized) return;
      _initialized = true;

      try {
        const { data } = await authClient.getSession();
        if (data) {
          Sentry.setUser({ id: data.user.id, email: data.user.email ?? undefined, username: data.user.name ?? undefined });
          set({
            isLoggedIn: true,
            uid: data.user.id,
            user: data.user,
            session: data.session,
            loading: false,
          });
        } else {
          Sentry.setUser(null);
          set({ ...initial, loading: false });
        }
      } catch (e) {
        Sentry.captureException(e, { tags: { store: 'auth', action: 'init' } });
        Sentry.setUser(null);
        set({ ...initial, loading: false });
      }
    },

    /** Sign in with a social provider */
    async signInSocial(provider: 'google' | 'github') {
      await authClient.signIn.social({ provider, callbackURL: "/projects" });
    },

    /** Sign in with email + password */
    async signInEmail(email: string, password: string) {
      const { error } = await authClient.signIn.email({ email, password });
      if (error) throw new Error(error.message ?? error.statusText ?? "Sign in failed");
      // Refresh the session store so the login-page redirect guard fires
      // (WL-003). force=true because init is idempotent after boot (WL-007).
      await this.init(true);
    },

    /** Sign up — creates Better Auth user only, caller handles profile */
    async signUp(email: string, password: string, username: string) {
      const { error } = await authClient.signUp.email({ email, password, name: username, callbackURL: "/onboarding" });
      if (error) throw new Error(error.message ?? error.statusText ?? "Sign up failed");
    },

    /** Verify email with token from verification link */
    async verifyEmail(token: string) {
      const { error } = await authClient.verifyEmail({ query: { token } });
      if (error) throw new Error(error.message ?? "Verification failed");
      // Refresh session after verification (force — init is idempotent, WL-007)
      await this.init(true);
    },

    /** Request password reset email */
    async forgetPassword(email: string) {
      const { error } = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw new Error(error.message ?? "Failed to send reset email");
    },

    /** Reset password with token from email link */
    async resetPassword(token: string, newPassword: string) {
      const { error } = await authClient.resetPassword({ newPassword, token });
      if (error) throw new Error(error.message ?? "Password reset failed");
    },

    /** Resend verification email */
    async resendVerification(email: string) {
      const { error } = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/onboarding",
      });
      if (error) throw new Error(error.message ?? "Failed to resend verification email");
    },

    /** Sign out */
    async signOut() {
      try {
        await authClient.signOut();
      } catch (e) {
        Sentry.captureException(e, { tags: { store: 'auth', action: 'signout' } });
      }
      Sentry.setUser(null);
      set({ ...initial, loading: false });
    },

    reset() {
      _initialized = false;
      set(initial);
    },
  };
}

const authStore = createAuthStore();

export default authStore;
