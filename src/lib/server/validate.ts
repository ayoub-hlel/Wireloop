import { z } from 'zod';

export type ZodIssue = {
  code: string;
  path: (string | number)[];
  message: string;
  expected?: string;
  received?: string;
};

export class ValidationError extends Error {
  constructor(public issues: ZodIssue[]) {
    super('Validation failed');
    this.name = 'ValidationError';
  }
}

export function validate<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new ValidationError(result.error.issues as ZodIssue[]);
  return result.data;
}
