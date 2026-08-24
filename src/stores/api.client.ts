/**
 * DB Client — replaces Convex with SvelteKit API routes + Drizzle.
 * Same interface so project.store / settings.store don't need rewrites.
 */
import { writable, derived, type Readable } from 'svelte/store';
import { browser } from '$app/environment';
import * as Sentry from '@sentry/sveltekit';
import { toast } from 'svelte-sonner';

// ── Types ──
export interface DBClient {
  query: (name: string, args?: Record<string, unknown>) => Promise<unknown>;
  mutation: (name: string, args?: Record<string, unknown>) => Promise<unknown>;
  subscribe: (name: string, args?: Record<string, unknown>, callback?: (data: unknown) => void) => () => void;
}

function rateLimitToast(res: Response): void {
  const retryAfter = Math.max(1, Math.ceil(Number(res.headers.get('retry-after')) || 3));
  toast.error('Slow down a moment', {
    description: `Too many requests — try again in ${retryAsSeconds(retryAfter)}.`,
  });
}

function retryAsSeconds(s: number): string {
  return s === 1 ? '1 second' : `${s} seconds`;
}

export type ApiClient = DBClient;

export interface DBConnectionState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
}

const initialConnectionState: DBConnectionState = {
  isConnected: false,
  isLoading: true,
  error: null,
  lastUpdated: 0,
};

export const connectionState = writable<DBConnectionState>(initialConnectionState);

// ── API Client ──
class Client implements DBClient {
  private baseUrl = '/api';

  async query(name: string, args: Record<string, unknown> = {}, retried = false): Promise<unknown> {
    Sentry.addBreadcrumb({ category: 'api', message: `query:${name}`, level: 'info', data: { args } });
    const start = performance.now();
    try {
      const res = await fetch(`${this.baseUrl}/query`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, args }),
      });
      if (res.status === 429) {
        // Queries are idempotent reads: one silent retry when the wait is short
        // enough that the user never notices. Longer waits → visible toast.
        const retryAfter = Number(res.headers.get('retry-after')) || 0;
        if (!retried && retryAfter > 0 && retryAfter <= 5) {
          await new Promise(r => setTimeout(r, retryAfter * 1000));
          return this.query(name, args, true);
        }
        rateLimitToast(res);
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText })) as { message?: string };
        const err = new Error(body.message || `Query failed: ${name}`);
        err.name = `QueryError:${name}`;
        // Don't report infrastructure pass-through errors (e.g. "Illegal invocation"
        // from Neon/fetch polyfill) to Sentry — they're server-side issues already
        // captured by the server's error handler. 429s are expected traffic shaping,
        // not errors worth alerting on.
        const isInfra = /illegal invocation|fetch failed|network/i.test(err.message);
        if (!isInfra && res.status !== 429) {
          Sentry.captureException(err, {
            tags: { api: 'query', name, status: String(res.status) },
            extra: { args, duration: performance.now() - start },
          });
        }
        throw err;
      }
      return res.json();
    } catch (err) {
      // Skip Sentry for server-originated infra errors (already captured server-side)
      // and for QueryErrors we already captured above.
      const skip = (err instanceof Error && (
        err.name.startsWith('QueryError:') ||
        /illegal invocation|fetch failed|network/i.test(err.message)
      ));
      if (!skip) {
        Sentry.captureException(err, { tags: { api: 'query', name }, extra: { args } });
      }
      throw err;
    }
  }

  async mutation(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
    Sentry.addBreadcrumb({ category: 'api', message: `mutation:${name}`, level: 'info', data: { args } });
    const start = performance.now();
    try {
      const res = await fetch(`${this.baseUrl}/mutation`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, args }),
      });
      if (res.status === 429) {
        // Mutations have side effects — never auto-retry, tell the user directly.
        rateLimitToast(res);
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText })) as { message?: string };
        const err = new Error(body.message || `Mutation failed: ${name}`);
        err.name = `MutationError:${name}`;
        const isInfra = /illegal invocation|fetch failed|network/i.test(err.message);
        if (!isInfra && res.status !== 429) {
          Sentry.captureException(err, {
            tags: { api: 'mutation', name, status: String(res.status) },
            extra: { args, duration: performance.now() - start },
          });
        }
        throw err;
      }
      return res.json();
    } catch (err) {
      const skip = (err instanceof Error && (
        err.name.startsWith('MutationError:') ||
        /illegal invocation|fetch failed|network/i.test(err.message)
      ));
      if (!skip) {
        Sentry.captureException(err, { tags: { api: 'mutation', name }, extra: { args } });
      }
      throw err;
    }
  }

  subscribe(): () => void {
    return () => {};
  }
}

let client: DBClient | null = null;

export function initializeApiClient(): void {
  if (!browser) return;
  // Idempotent — root and studio layouts both call this on mount (WL-007).
  if (client) return;

  connectionState.set({ isConnected: true, isLoading: false, error: null, lastUpdated: Date.now() });
  client = new Client();
}

export function getApiClient(): DBClient {
  if (!client) {
    throw new Error('DB client not initialized. Call initializeApiClient() first.');
  }
  return client;
}

// ── Derived stores ──
export const isConnected: Readable<boolean> = derived(connectionState, ($s) => $s.isConnected);
export const isLoading: Readable<boolean> = derived(connectionState, ($s) => $s.isLoading);
export const error: Readable<string | null> = derived(connectionState, ($s) => $s.error);

export function createMutation<TArgs extends Record<string, unknown>, TResult>(mutationName: string) {
  return async (args: TArgs): Promise<TResult> => {
    if (!client) throw new Error('DB client not initialized');
    const result = await client.mutation(mutationName, args);
    return result as TResult;
  };
}
