import { writable, derived } from "svelte/store";
// TODO: CLERK_REMOVAL — do not delete yet.
// import { authState as clerkAuthState, isSignedIn, userId } from "./clerk-auth.store";

/**
 * Legacy auth store interface for backward compatibility
 */
export interface LegacyAuthState {
  isLoggedIn: boolean;
  uid: string | null;
  legacyControlled: boolean;
}

/**
 * Internal writable store for legacy compatibility
 * This allows manual overrides during migration phase
 */
const legacyAuthStore = writable<LegacyAuthState>({ 
  isLoggedIn: false, 
  uid: null, 
  legacyControlled: false 
});

/**
 * Derived store that combines Clerk auth state with legacy overrides
 * This provides seamless migration from Firebase to Clerk
 */
const combinedAuthStore = derived(
  [legacyAuthStore],
  ([legacyAuth]) => {
    // During migration, allow manual overrides via legacyAuthStore.set()
    
    if (legacyAuth.legacyControlled) {
      // Legacy compatibility mode - use the manually set state
      return legacyAuth;
    }
    
    // TODO: CLERK_REMOVAL — default to signed out
    return {
      isLoggedIn: false,
      uid: null,
      legacyControlled: false
    };
  }
);

/**
 * Export the combined store with legacy interface
 * This maintains compatibility with existing components
 */
export default {
  subscribe: combinedAuthStore.subscribe,
  set: legacyAuthStore.set,
  
  // Additional helper methods for migration
  /**
   * Force update to Clerk-only mode
   */
  useClerkOnly: () => {
    legacyAuthStore.set({
      isLoggedIn: false,
      uid: null,
      legacyControlled: false
    });
  },
  
  /**
   * Temporarily enable Firebase compatibility mode
   */
  enableFirebaseMode: () => {
    legacyAuthStore.update(state => ({
      ...state,
      // @ts-ignore
      firebaseControlled: true
    }));
  }
};
