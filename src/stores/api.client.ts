/**
 * DB Client — replaces Convex with SvelteKit API routes + Drizzle.
 * Same interface so project.store / settings.store don't need rewrites.
 */
import { writable, derived, type Readable } from 'svelte/store';
import { browser } from '$app/environment';
import * as Sentry from '@sentry/sveltekit';

// ── Types ──
export interface DBClient {
  query: (name: string, args?: Record<string, unknown>) => Promise<unknown>;
  mutation: (name: string, args?: Record<string, unknown>) => Promise<unknown>;
  subscribe: (name: string, args?: Record<string, unknown>, callback?: (data: unknown) => void) => () => void;
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

  async query(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
    Sentry.addBreadcrumb({ category: 'api', message: `query:${name}`, level: 'info', data: { args } });
    const start = performance.now();
    try {
      const res = await fetch(`${this.baseUrl}/query`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, args }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText })) as { message?: string };
        const err = new Error(body.message || `Query failed: ${name}`);
        Sentry.captureException(err, {
          tags: { api: 'query', name, status: String(res.status) },
          extra: { args, duration: performance.now() - start },
        });
        throw err;
      }
      return res.json();
    } catch (err) {
      if (!(err instanceof Error && err.message.startsWith('Query failed'))) {
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
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText })) as { message?: string };
        const err = new Error(body.message || `Mutation failed: ${name}`);
        Sentry.captureException(err, {
          tags: { api: 'mutation', name, status: String(res.status) },
          extra: { args, duration: performance.now() - start },
        });
        throw err;
      }
      return res.json();
    } catch (err) {
      if (!(err instanceof Error && err.message.startsWith('Mutation failed'))) {
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

export function createMutation<TArgs, TResult>(mutationName: string) {
  return async (args: TArgs): Promise<TResult> => {
    if (!client) throw new Error('DB client not initialized');
    const result = await client.mutation(mutationName, args);
    return result as TResult;
  };
}
