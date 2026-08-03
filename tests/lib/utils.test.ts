import { describe, it, expect, expectTypeOf } from 'vitest';
import { cn, type WithoutChild, type WithoutChildren, type WithoutChildrenOrChild } from '@/lib/utils';

// Regression: the shadcn/ui components import WithoutChild/WithoutChildren/
// WithoutChildrenOrChild from $lib/utils.js. Those are bits-ui type helpers.
// They must stay re-exported through utils — a removed/reordered re-export
// breaks the entire ui/** tree with "Module has no exported member" (check
// bucket 2, 10 errors). This locks the contract and the strip semantics.
describe('utils.js type re-exports (bits-ui)', () => {
  it('re-exports the child-stripping types and they behave', () => {
    type HasChild = { child?: unknown; name: string };
    type HasChildren = { children?: unknown; label: string };

    expectTypeOf<WithoutChild<HasChild>>().toEqualTypeOf<{ name: string }>();
    expectTypeOf<WithoutChildren<HasChildren>>().toEqualTypeOf<{ label: string }>();
    expectTypeOf<WithoutChildrenOrChild<HasChild & HasChildren>>().toEqualTypeOf<{
      name: string;
      label: string;
    }>();
  });

  it('cn still merges classes (unchanged behavior)', () => {
    expect(cn('a', { b: true }, ['c'])).toBe('a b c');
  });
});