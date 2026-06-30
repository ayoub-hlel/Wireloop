import { writable, derived } from 'svelte/store';
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
  const { subscribe, set, update } = writable<AuthState>(initial);

  return {
    subscribe,
    set,

    /** Initialize — fetch session from Better Auth */
    async init() {
      try {
        const { data, error } = await authClient.getSession();
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
      if (error) throw error;
    },

    /** Sign up */
    async signUp(email: string, password: string, name: string) {
      const { error } = await authClient.signUp.email({ email, password, name });
      if (error) throw error;
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
