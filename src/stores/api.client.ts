/**
 * DB Client — replaces Convex with SvelteKit API routes + Drizzle.
 * Same interface so project.store / settings.store don't need rewrites.
 */
import { writable, derived, type Readable } from 'svelte/store';
import { browser } from '$app/environment';

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

  async mutation(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
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

  subscribe(): () => void {
    return () => {};
  }
}

let client: DBClient | null = null;

export function initializeApiClient(): void {
  if (!browser) return;

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
