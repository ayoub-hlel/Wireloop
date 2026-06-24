declare global {
  namespace App {
    interface Locals {
      user: import('better-auth').User | null;
      session: import('better-auth').Session | null;
    }

    interface Platform {
      env: {
        R2: import('@cloudflare/workers-types').R2Bucket;
      };
      context: import('@cloudflare/workers-types').ExecutionContext;
      caches: import('@cloudflare/workers-types').CacheStorage;
    }
  }
}

export {};
