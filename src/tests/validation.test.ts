import { describe, it, expect } from 'vitest';
import { project } from '$lib/server/validation';

const validUUID = '550e8400-e29b-41d4-a716-446655440000';

const schemas: [string, typeof project.star][] = [
  ['star', project.star],
  ['unstar', project.unstar],
  ['fork', project.fork],
  ['trash', project.trash],
  ['restore', project.restore],
  ['trackRecent', project.trackRecent],
];

describe('project mutation schemas', () => {
  for (const [name, schema] of schemas) {
    it(`accepts valid ${name} input`, () => {
      expect(schema.parse({ projectId: validUUID })).toEqual({ projectId: validUUID });
    });

    it(`rejects invalid ${name} input`, () => {
      expect(() => schema.parse({})).toThrow();
      expect(() => schema.parse({ projectId: 'not-a-uuid' })).toThrow();
      expect(() => schema.parse({ projectId: validUUID, extra: true })).toThrow();
    });
  }
});
