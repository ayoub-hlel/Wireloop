import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDashboard } from '@/routes/(fullpage)/projects/dashboard.svelte';

// Regression lock for the bucket-15 sidebar filter architecture.
// Each filter dispatches a specific query name through fetchList; the default is
// 'recents'; restore re-fetches the trash list when in trash filter; switching
// filter clears stale search. Same mock harness as dashboard-sort.test.ts.

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

// ponytail: $app/navigation goto — the open() path uses it; we never call open()
// here, but stub anyway so module load doesn't reach for a real router.
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

// orgStore is used in dashboard.svelte.ts (fetchOrgs, setSelectedOrg). Stub both.
vi.mock('@/stores/org.store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/stores/org.store')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      fetchOrgs: vi.fn(async () => {}),
      setSelectedOrg: vi.fn(),
      subscribe: (cb: (v: unknown) => void) => {
        cb({ id: null });
        return () => {};
      },
    },
  };
});

describe('createDashboard filter dispatch (bucket-15 architecture)', () => {
  beforeEach(() => {
    vi.resetModules();
    mockQuery.mockReset();
    mockMutation.mockReset();
    // Default: every query returns [] unless overridden in the test.
    mockQuery.mockResolvedValue([]);
  });

  function queriesMock(): { [name: string]: unknown[] } {
    return {
      'projects:getStarredProjects': [],
      'projects:getRecentProjects': [],
      'projects:getDrafts': [],
      'projects:getPublicProjects': [],
      'projects:getTrashedProjects': [],
      'org:getOrgProjects': [],
    };
  }

  it('defaults to the recents filter on init', async () => {
    const seen: string[] = [];
    mockQuery.mockImplementation(async (name: string) => {
      seen.push(name);
      return [];
    });
    const dash = createDashboard();
    await dash.init();
    expect(dash.filter).toBe('recents');
    // init() fan-out: getStarredProjects (for starredIds), getRecentProjects (the default filter).
    expect(seen).toContain('projects:getStarredProjects');
    expect(seen).toContain('projects:getRecentProjects');
  });

  it('setFilter("community") dispatches getPublicProjects', async () => {
    mockQuery.mockImplementation(async (name: string) => {
      const m = queriesMock();
      if (name === 'projects:getPublicProjects') return [{ id: 'p1', name: 'pub', updatedAt: '2024-01-01T00:00:00Z' }];
      return m[name as keyof ReturnType<typeof queriesMock>] ?? [];
    });
    const dash = createDashboard();
    await dash.init();
    await dash.setFilter('community');
    expect(dash.filter).toBe('community');
    expect(dash.visible.map(p => p.id)).toEqual(['p1']);
  });

  it('setFilter("trash") dispatches getTrashedProjects', async () => {
    let trashCalled = 0;
    mockQuery.mockImplementation(async (name: string) => {
      const m = queriesMock();
      if (name === 'projects:getTrashedProjects') { trashCalled += 1; return [{ id: 't1', name: 'trashed', updatedAt: '2024-01-01T00:00:00Z' }]; }
      return m[name as keyof ReturnType<typeof queriesMock>] ?? [];
    });
    const dash = createDashboard();
    await dash.init();
    await dash.setFilter('trash');
    expect(dash.filter).toBe('trash');
    expect(trashCalled).toBe(1);
    expect(dash.visible.map(p => p.id)).toEqual(['t1']);
  });

  it('setFilter("starred") dispatches getStarredProjects', async () => {
    mockQuery.mockImplementation(async (name: string) => {
      const m = queriesMock();
      if (name === 'projects:getStarredProjects') return [{ id: 's1', name: 'star', updatedAt: '2024-01-01T00:00:00Z' }];
      return m[name as keyof ReturnType<typeof queriesMock>] ?? [];
    });
    const dash = createDashboard();
    await dash.init();
    await dash.setFilter('starred');
    expect(dash.filter).toBe('starred');
    // visible is the post-filter list; starred filter returns the starredRows from query.
    expect(dash.visible.map(p => p.id)).toEqual(['s1']);
  });

  it('setFilter("resources") with no selected org issues no org query', async () => {
    let orgQueryCalls = 0;
    mockQuery.mockImplementation(async (name: string) => {
      const m = queriesMock();
      if (name === 'org:getOrgProjects') { orgQueryCalls += 1; return []; }
      return m[name as keyof ReturnType<typeof queriesMock>] ?? [];
    });
    const dash = createDashboard();
    await dash.init();
    await dash.setFilter('resources');
    expect(dash.filter).toBe('resources');
    // ponytail: no orgId set → short-circuits to rows=[] without hitting the API.
    expect(orgQueryCalls).toBe(0);
    expect(dash.visible).toEqual([]);
  });

  it('clears stale search when switching filter', async () => {
    const log: string[] = [];
    mockQuery.mockImplementation(async (name: string) => {
      const m = queriesMock();
      if (name === 'projects:getRecentProjects') return [{ id: 'r1', name: 'recent project', updatedAt: '2024-01-01T00:00:00Z' }];
      if (name === 'projects:getPublicProjects') return [{ id: 'p1', name: 'pub', updatedAt: '2024-01-01T00:00:00Z' }];
      log.push(name);
      return m[name as keyof ReturnType<typeof queriesMock>] ?? [];
    });
    const dash = createDashboard();
    await dash.init();
    dash.search = 'recent'; // user typed in the toolbar while on recents
    // visible filters by the search term (live filter)
    expect(dash.visible.map(p => p.id)).toEqual(['r1']); // 'recent project' contains 'recent'

    await dash.setFilter('community');
    // ponytail: switching filter clears the search box; community list is unaffected
    // by the previous 'recent' term (no live-filter leakage across filters).
    expect(dash.search).toBe('');
    // The community row 'pub' is the only one and survives the cleared filter.
    expect(dash.visible.map(p => p.id)).toEqual(['p1']);
  });

  it('setFilter is a no-op when the filter is already active', async () => {
    let calls = 0;
    mockQuery.mockImplementation(async (name: string) => {
      calls += 1;
      const m = queriesMock();
      return m[name as keyof ReturnType<typeof queriesMock>] ?? [];
    });
    const dash = createDashboard();
    await dash.init();
    const before = calls;
    await dash.setFilter('recents'); // already the default
    expect(calls).toBe(before); // no extra fetch
    expect(dash.filter).toBe('recents');
  });

  it('restore() refetches getTrashedProjects while on the trash filter', async () => {
    let trashCalls = 0;
    const mockQueries = queriesMock();
    mockQuery.mockImplementation(async (name: string) => {
      if (name === 'projects:getTrashedProjects') {
        trashCalls += 1;
        return [{ id: 't1', name: 'trashed', updatedAt: '2024-01-01T00:00:00Z' }];
      }
      return mockQueries[name as keyof typeof mockQueries] ?? [];
    });
    const dash = createDashboard();
    await dash.init();
    await dash.setFilter('trash');
    const trashCallsBeforeRestore = trashCalls;
    await dash.restore('t1');
    expect(mockMutation).toHaveBeenCalledWith('projects:restoreProject', { projectId: 't1' });
    expect(trashCalls).toBeGreaterThan(trashCallsBeforeRestore); // refetched trash list
  });

  it('trash() removes the project from the list when NOT in trash filter', async () => {
    mockQuery.mockImplementation(async (name: string) => {
      const m = queriesMock();
      if (name === 'projects:getRecentProjects') return [
        { id: 'r1', name: 'one', updatedAt: '2024-01-01T00:00:00Z' },
        { id: 'r2', name: 'two', updatedAt: '2024-01-02T00:00:00Z' },
      ];
      return m[name as keyof ReturnType<typeof queriesMock>] ?? [];
    });
    const dash = createDashboard();
    await dash.init();
    expect(dash.visible.map(p => p.id)).toEqual(['r2', 'r1']); // desc by updatedAt
    await dash.trash('r1');
    expect(mockMutation).toHaveBeenCalledWith('projects:trashProject', { projectId: 'r1' });
    // ponytail: non-trash filter removes from the local list instead of refetching.
    expect(dash.visible.map(p => p.id)).toEqual(['r2']);
  });

  it('fork() refetches the current filter (community)', async () => {
    let communityCalls = 0;
    mockQuery.mockImplementation(async (name: string) => {
      const m = queriesMock();
      if (name === 'projects:getPublicProjects') {
        communityCalls += 1;
        return [{ id: 'p1', name: 'pub', updatedAt: '2024-01-01T00:00:00Z' }];
      }
      return m[name as keyof ReturnType<typeof queriesMock>] ?? [];
    });
    const dash = createDashboard();
    await dash.init();
    await dash.setFilter('community');
    const before = communityCalls;
    await dash.fork('p1');
    expect(mockMutation).toHaveBeenCalledWith('projects:forkProject', { projectId: 'p1' });
    expect(communityCalls).toBeGreaterThan(before); // refetched current filter
  });
});

// ponytail: the Sort suite (already in dashboard-sort.test.ts) owns sort behavior;
// this file owns filter dispatch + restore/fork/trash side-effects.
