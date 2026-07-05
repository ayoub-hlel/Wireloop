/**
 * DB Client — replaces Convex with SvelteKit API routes + Drizzle.
 * Same interface so project.store / settings.store don't need rewrites.
 */
import { writable, derived, type Readable } from 'svelte/store';
import { browser } from '$app/environment';

// ── Types ──
export interface DBClient {
  query: (name: string, args?: any) => Promise<any>;
  mutation: (name: string, args?: any) => Promise<any>;
  subscribe: (name: string, args?: any, callback?: (data: any) => void) => () => void;
}

// ponytail: alias for backward compat
export type ConvexClient = DBClient;

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
class ApiClient implements DBClient {
  private baseUrl = '/api';

  async query(name: string, args: any = {}): Promise<any> {
    const res = await fetch(`${this.baseUrl}/query`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, args }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: res.statusText })) as { message?: string };
      throw new Error(body.message || `Query failed: ${name}`);
    }
    return res.json();
  }

  async mutation(name: string, args: any = {}): Promise<any> {
    const res = await fetch(`${this.baseUrl}/mutation`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, args }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: res.statusText })) as { message?: string };
      throw new Error(body.message || `Mutation failed: ${name}`);
    }
    return res.json();
  }

  subscribe(_name: string, _args: any = {}, _callback?: (data: any) => void): () => void {
    // ponytail: subscriptions not needed — Svelte stores refetch on demand
    return () => {};
  }
}

let client: DBClient | null = null;

export function initializeConvexClient(): void {
  if (!browser) return;

  connectionState.set({ isConnected: true, isLoading: false, error: null, lastUpdated: Date.now() });
  client = new ApiClient();
}

export function getConvexClient(): DBClient {
  if (!client) {
    throw new Error('DB client not initialized. Call initializeConvexClient() first.');
  }
  return client;
}

// ── Derived stores ──
export const isConnected: Readable<boolean> = derived(connectionState, ($s) => $s.isConnected);
export const isLoading: Readable<boolean> = derived(connectionState, ($s) => $s.isLoading);
export const error: Readable<string | null> = derived(connectionState, ($s) => $s.error);

// ── Reactive helpers (adapted from original) ──
export function createQuery<T>(queryName: string, args: any = {}): Readable<{
  data: T | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
}> {
  const store = writable({ data: null as T | null, isLoading: true, error: null as string | null, lastUpdated: 0 });

  if (browser && client) {
    client.query(queryName, args)
      .then(data => store.set({ data, isLoading: false, error: null, lastUpdated: Date.now() }))
      .catch(err => store.set({ data: null, isLoading: false, error: err.message, lastUpdated: Date.now() }));
  }

  return { subscribe: store.subscribe };
}

export function createMutation<TArgs, TResult>(_mutationName: string) {
  return async (args: TArgs): Promise<TResult> => {
    if (!client) throw new Error('DB client not initialized');
    const result = await client.mutation(_mutationName, args);
    return result as TResult;
  };
}


