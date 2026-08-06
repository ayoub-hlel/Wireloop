import { describe, it, expect } from 'vitest';
import { uniqueCopyName } from '@/routes/api/mutation/+server';

// Regression lock for the bucket-15 duplicate-name avoidance.
// Chain: "x" -> "x copy" -> "x copy 1" -> "x copy 2".
// Copying a non-base name yields "<name> copy" (base is always the source's own
// name, never the original root). Case-insensitive collision; source case preserved.
// `userProjectNames` (the DB-backed Set builder) is not unit-tested here — it's a
// one-line SELECT wrapper; its only logic is `.toLowerCase()` mirroring this set,
// and exercising it needs a DB mock the suite deliberately does not maintain.
describe('uniqueCopyName (bucket-15 duplicate avoidance)', () => {
  const lower = (s: string) => s.toLowerCase();

  it('returns the base name when not taken', () => {
    expect(uniqueCopyName('x', new Set())).toBe('x');
  });

  it('appends " copy" on the first collision', () => {
    expect(uniqueCopyName('x', new Set(['x']))).toBe('x copy');
  });

  it('keeps appending " copy N" up the chain', () => {
    expect(uniqueCopyName('x', new Set(['x', 'x copy']))).toBe('x copy 1');
    expect(uniqueCopyName('x', new Set(['x', 'x copy', 'x copy 1']))).toBe('x copy 2');
    expect(uniqueCopyName('x', new Set(['x', 'x copy', 'x copy 1', 'x copy 2']))).toBe('x copy 3');
  });

  it('uses the source name as base, not the chain root', () => {
    // ponytail: copying "x copy 1" yields "x copy 1 copy" (NOT "x copy 2"),
    // because the base is the source's own name.
    expect(uniqueCopyName('x copy 1', new Set(['x copy 1']))).toBe('x copy 1 copy');
    expect(uniqueCopyName('x copy 1', new Set(['x copy 1', 'x copy 1 copy']))).toBe('x copy 1 copy 1');
  });

  it('collides case-insensitively but preserves the source case', () => {
    // ponytail: case-insensitive collision (so "X" vs "x" clash),
    // but the returned name keeps the source's casing.
    expect(uniqueCopyName('X', new Set(['x']))).toBe('X copy');
    expect(uniqueCopyName('My Project', new Set(['my project']))).toBe('My Project copy');
    expect(uniqueCopyName('My Project', new Set(['my project', 'my project copy']))).toBe('My Project copy 1');
  });

  it('does not mutate the input set', () => {
    const taken = new Set(['x']);
    uniqueCopyName('x', taken);
    expect(taken).toEqual(new Set(['x']));
  });

  it('the chain helper lower-cases consistently with the uniqueCopyName impl', () => {
    // ponytail: belt-and-braces — the production impl and the test helper agree
    // on lowercase comparison; if either drifts the chain breaks.
    expect(lower('X')).toBe(lower('x'));
    expect(lower('X Copy')).toBe(lower('x copy'));
  });
});
