// ponytail: dead code stub
export interface DatabaseError { code: string; message: string; }
export function handleDatabaseError(_err: any, _context?: string): DatabaseError {
  return { code: 'UNKNOWN', message: 'Database error' };
}
