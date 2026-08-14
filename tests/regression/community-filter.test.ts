import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(__dirname, '../../src/routes/api/query/+server.ts'),
  'utf8',
);

describe('community project query contract', () => {
  it('excludes private, deleted, organization, and own projects', () => {
    expect(source).toMatch(
      /eq\(projects\.isPublic, true\).*isNull\(projects\.deletedAt\).*isNull\(projects\.orgId\).*not\(eq\(projects\.userId, userId\)\)/s,
    );
  });

  it('caps community results and orders newest first', () => {
    expect(source).toContain('.orderBy(desc(projects.updatedAt))');
    expect(source).toContain('.limit(100)');
  });
});
