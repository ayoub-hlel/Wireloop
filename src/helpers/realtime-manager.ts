// ponytail: stub — real-time subscriptions are handled by Svelte store refetches
import { writable, type Readable } from 'svelte/store';

export function subscribeToProject(_projectId: string): Readable<any> {
  return writable({ data: null, isLoading: false, error: null });
}
export function subscribeToUserProjects(_userId: string): Readable<any> {
  return writable({ data: null, isLoading: false, error: null });
}
export function subscribeToPublicProjects(): Readable<any> {
  return writable({ data: null, isLoading: false, error: null });
}
