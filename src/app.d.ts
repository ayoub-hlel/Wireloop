declare global {
  namespace App {
    interface Locals {
      user: import('better-auth').User | null;
      session: import('better-auth').Session | null;
      // Set when the auth factory is unavailable (missing env or init failure),
      // so route gates can distinguish a config error from a logged-out user (WL-002).
      authError?: string;
    }

    interface Platform {
      env: {
        R2: import('@cloudflare/workers-types').R2Bucket;
      };
      ctx: import('@cloudflare/workers-types').ExecutionContext;
      caches: import('@cloudflare/workers-types').CacheStorage;
    }
  }
}

export {};
