import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDashboard } from '@/routes/(fullpage)/projects/dashboard.svelte';

// Regression: the projects dashboard `visible` sort crashed the previous type
// (`new Date(a.updatedAt)` rejects a `Date | string` union) and mis-ordered
// rows whose updatedAt arrived as a string-ISO value. The `toTime` guard in
// dashboard.svelte.ts normalises both. Lock that behaviour here so a future
// change doesn't reintroduce the string/Date split.
const { mockQuery, mockMutation } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockMutation: vi.fn(),
}));

vi.mock('@/stores/api.client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/stores/api.client')>();
  return {
    ...actual,
    getApiClient: () => ({ query: mockQuery, mutation: mockMutation, subscribe: () => () => {} }),
  };
});

describe('createDashboard visible sort (updatedAt Date|string)', () => {
  beforeEach(() => {
    vi.resetModules();
    mockQuery.mockReset();
    mockMutation.mockReset();
  });

  function seed(rows: Array<Record<string, unknown>>) {
    mockQuery.mockImplementation(async (name: string) => {
      if (name === 'projects:getDrafts') return rows;
      if (name === 'projects:getRecentProjects') return rows;
      if (name === 'projects:getStarredProjects') return [];
      if (name === 'projects:getTrashedProjects') return [];
      return [];
    });
  }

  it('sorts most-recent-first when updatedAt is supplied as an ISO string', async () => {
    seed([
      { id: 'a', name: 'old', updatedAt: '2024-01-01T00:00:00Z' },
      { id: 'b', name: 'new', updatedAt: '2024-05-01T00:00:00Z' },
      { id: 'c', name: 'mid', updatedAt: '2024-03-01T00:00:00Z' },
    ]);

    const dash = createDashboard();
    await dash.init();

    expect(dash.visible.map(p => p.id)).toEqual(['b', 'c', 'a']);
  });

  it('sorts most-recent-first even when updatedAt is a Date instance', async () => {
    seed([
      { id: 'a', name: 'old', updatedAt: new Date('2024-01-01T00:00:00Z') },
      { id: 'b', name: 'new', updatedAt: new Date('2024-05-01T00:00:00Z') },
    ]);

    const dash = createDashboard();
    await dash.init();

    expect(dash.visible.map(p => p.id)).toEqual(['b', 'a']);
  });
});