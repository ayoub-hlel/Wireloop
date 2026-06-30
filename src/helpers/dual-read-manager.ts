// ponytail: dead code stub — dual-read (Firebase+Convex) pattern removed
export enum DataSource { CONVEX = 'convex', FIREBASE = 'firebase', CACHE = 'cache' }
export interface DataReadResult<T> { data: T | null; source: DataSource; timestamp: number; error?: string; }
export async function getProjectWithFallback(_id: string, _uid: string): Promise<DataReadResult<any>> {
  return { data: null, source: DataSource.CONVEX, timestamp: Date.now(), error: 'Not implemented' };
}
export async function getUserProjectsWithFallback(_uid: string): Promise<DataReadResult<any[]>> {
  return { data: null, source: DataSource.CONVEX, timestamp: Date.now(), error: 'Not implemented' };
}
export async function getProjectFileWithFallback(_id: string, _uid: string): Promise<DataReadResult<any>> {
  return { data: null, source: DataSource.CONVEX, timestamp: Date.now(), error: 'Not implemented' };
}
export function configureDualRead(_config?: any) {}
