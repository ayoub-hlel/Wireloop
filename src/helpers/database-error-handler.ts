// ponytail: stub — error handling is inline in API routes now
export type DatabaseError = Error & { code?: string; context?: any };
export function handleDatabaseError(err: any, _operation: string, _context?: any): DatabaseError {
  return err instanceof Error ? err : new Error(String(err));
}
export async function withDatabaseRetry<T>(fn: () => Promise<T>, _op: string, _ctx?: any): Promise<T> {
  return fn();
}
export async function withOptimisticUpdate<T>(_opt: () => void, _roll: () => void, fn: () => Promise<T>, _op: string): Promise<T> {
  return fn();
}
export async function withBatchOperation<T>(_ops: any[], _opts?: any): Promise<Array<{ success: boolean; result?: T; error?: any }>> {
  return [];
}
