import { writable } from 'svelte/store';
import { authClient } from '$lib/client/auth-client';
import type { Session, User } from 'better-auth';

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

  return {
    subscribe,
    set,

    /** Initialize — fetch session from Better Auth */
    async init() {
      try {
        const { data } = await authClient.getSession();
        if (data) {
          set({
            isLoggedIn: true,
            uid: data.user.id,
            user: data.user,
            session: data.session,
            loading: false,
          });
        } else {
          set({ ...initial, loading: false });
        }
      } catch {
        set({ ...initial, loading: false });
      }
    },

    /** Sign in with a social provider */
    async signInSocial(provider: 'google' | 'github') {
      await authClient.signIn.social({ provider });
    },

    /** Sign in with email + password */
    async signInEmail(email: string, password: string) {
      const { error } = await authClient.signIn.email({ email, password });
      if (error) throw new Error(error.message ?? error.statusText ?? "Sign in failed");
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
      // Refresh session after verification
      await this.init();
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
      await authClient.signOut();
      set({ ...initial, loading: false });
    },

    reset() {
      set(initial);
    },
  };
}

const authStore = createAuthStore();

export default authStore;
