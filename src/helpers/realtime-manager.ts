// ponytail: dead code stub — realtime subscriptions removed
import type { Readable } from 'svelte/store';

export const subscribeToProject = (_id: string): Readable<any> => ({ subscribe: (cb: any) => { cb(null); return () => {}; } });
export const subscribeToUserProjects = (_uid: string): Readable<any[]> => ({ subscribe: (cb: any) => { cb([]); return () => {}; } });
export const subscribeToPublicProjects = (): Readable<any[]> => ({ subscribe: (cb: any) => { cb([]); return () => {}; } });
