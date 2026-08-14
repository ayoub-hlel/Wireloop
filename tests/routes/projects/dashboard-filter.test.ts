import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDashboard, shouldRefetch } from '@/routes/(fullpage)/projects/dashboard.svelte';

// Regression lock for the sidebar filter architecture.
//
// Retargeted from the old 6-filter / per-filter-endpoint design
// ('recents' | 'resources' | ... each with its own projects:getXProjects query)
// to the current 4-filter design: one endpoint, projects:list, with the filter
// and org scope passed as arguments. Coverage is preserved and tightened —
// each case now asserts the ARGS dispatched, not just the query name, because
// with a single endpoint the args are the only thing distinguishing filters.

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

type ListArgs = { filter?: string; orgId?: string | null };

/** Rows returned per filter; anything unlisted resolves to []. */
function seedByFilter(byFilter: Record<string, unknown[]>) {
  const calls: ListArgs[] = [];
  mockQuery.mockImplementation(async (name: string, args: ListArgs = {}) => {
    if (name !== 'projects:list') return [];
    calls.push(args);
    return byFilter[args.filter ?? ''] ?? [];
  });
  return calls;
}

const row = (id: string, name = id, updatedAt = '2024-01-01T00:00:00Z') => ({ id, name, updatedAt });

describe('createDashboard filter dispatch (single projects:list endpoint)', () => {
  beforeEach(() => {
    vi.resetModules();
    mockQuery.mockReset();
    mockMutation.mockReset();
    mockQuery.mockResolvedValue([]);
  });

  it('defaults to the projects filter and dispatches projects:list on init', async () => {
    const calls = seedByFilter({});
    const dash = createDashboard();
    await dash.init();

    expect(dash.filter).toBe('projects');
    // init() fan-out: one call to seed starredIds, one for the active filter.
    expect(calls.map(c => c.filter)).toContain('starred');
    expect(calls.map(c => c.filter)).toContain('projects');
    // Every dispatch goes through the one endpoint — no per-filter endpoints.
    expect(mockQuery.mock.calls.every(([name]) => name === 'projects:list')).toBe(true);
  });

  it('setFilter("community") dispatches projects:list with filter=community', async () => {
    const calls = seedByFilter({ community: [row('p1', 'pub')] });
    const dash = createDashboard();
    await dash.init();
    await dash.setFilter('community');

    expect(dash.filter).toBe('community');
    expect(calls.some(c => c.filter === 'community')).toBe(true);
    expect(dash.visible.map(p => p.id)).toEqual(['p1']);
  });

  it('setFilter("trash") dispatches filter=trash exactly once', async () => {
    const calls = seedByFilter({ trash: [row('t1', 'trashed')] });
    const dash = createDashboard();
    await dash.init();
    await dash.setFilter('trash');

    expect(dash.filter).toBe('trash');
    expect(calls.filter(c => c.filter === 'trash')).toHaveLength(1);
    expect(dash.visible.map(p => p.id)).toEqual(['t1']);
  });

  it('setFilter("starred") dispatches filter=starred', async () => {
    seedByFilter({ starred: [row('s1', 'star')] });
    const dash = createDashboard();
    await dash.init();
    await dash.setFilter('starred');

    expect(dash.filter).toBe('starred');
    expect(dash.visible.map(p => p.id)).toEqual(['s1']);
  });

  it('personal-scoped filters clear orgId so no org rows leak in', async () => {
    const calls = seedByFilter({});
    const dash = createDashboard();
    await dash.init();
    await dash.setFilter('starred');

    // ponytail: starred/community are personal-scoped — orgId must be null.
    const starredCall = calls.find(c => c.filter === 'starred' && c.orgId !== undefined);
    expect(starredCall?.orgId ?? null).toBeNull();
  });

  it('clears stale search when switching filter', async () => {
    seedByFilter({
      projects: [row('r1', 'recent project')],
      community: [row('p1', 'pub')],
    });
    const dash = createDashboard();
    await dash.init();

    dash.search = 'recent'; // user typed in the toolbar
    expect(dash.visible.map(p => p.id)).toEqual(['r1']);

    await dash.setFilter('community');
    // Switching filter clears the search box — no live-filter leakage across filters.
    expect(dash.search).toBe('');
    expect(dash.visible.map(p => p.id)).toEqual(['p1']);
  });

  it('setFilter is a no-op when the filter is already active', async () => {
    seedByFilter({});
    const dash = createDashboard();
    await dash.init();

    const before = mockQuery.mock.calls.length;
    await dash.setFilter('projects'); // already the default
    expect(mockQuery.mock.calls.length).toBe(before); // no extra fetch
    expect(dash.filter).toBe('projects');
  });

  it('init dispatches the starred + active list requests in parallel', async () => {
    // seedByFilter resolves immediately, but the two requests must be ISSUED
    // before init's first await resolves — sequential awaits would defer the
    // second call until after the first resolves.
    const calls = seedByFilter({});
    const dash = createDashboard();
    void dash.init();
    expect(mockQuery.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(calls.map(c => c.filter)).toEqual(expect.arrayContaining(['starred', 'projects']));
  });

  it('setOrg dispatches org-scoped projects:list exactly once per org', async () => {
    const calls = seedByFilter({ projects: [row('r1', 'org proj')] });
    const dash = createDashboard();
    await dash.init();
    await dash.setOrg('org1');

    expect(dash.filter).toBe('projects');
    expect(calls.filter(c => c.filter === 'projects' && c.orgId === 'org1')).toHaveLength(1);
    expect(dash.visible.map(p => p.id)).toEqual(['r1']);

    // same org again — no refetch.
    const before = mockQuery.mock.calls.length;
    await dash.setOrg('org1');
    expect(mockQuery.mock.calls.length).toBe(before);
  });

  it('setOrg switches starred to org-scoped projects', async () => {
    const calls = seedByFilter({ starred: [row('s1', 'star')] });
    const dash = createDashboard();
    await dash.init();
    await dash.setFilter('starred');
    await dash.setOrg('org1');

    expect(dash.filter).toBe('projects');
    expect(calls.filter(c => c.filter === 'projects' && c.orgId === 'org1')).toHaveLength(1);
  });

  it('shouldRefetch throttles refetches to one per cooldown window', () => {
    expect(shouldRefetch(0, 5000)).toBe(true); // far past the cooldown — allowed
    expect(shouldRefetch(5000, 6000)).toBe(false); // inside the 2s window
    expect(shouldRefetch(5000, 7000)).toBe(true); // window elapsed
    expect(shouldRefetch(7000, 7000, 5000)).toBe(false); // custom cooldown
  });

  it('restore() refetches the trash list while on the trash filter', async () => {
    const calls = seedByFilter({ trash: [row('t1', 'trashed')] });
    const dash = createDashboard();
    await dash.init();
    await dash.setFilter('trash');

    const before = calls.filter(c => c.filter === 'trash').length;
    await dash.restore('t1');

    expect(mockMutation).toHaveBeenCalledWith('projects:restoreProject', { projectId: 't1' });
    expect(calls.filter(c => c.filter === 'trash').length).toBeGreaterThan(before);
  });

  it('trash() removes the project from the list when NOT in trash filter', async () => {
    seedByFilter({
      projects: [row('r1', 'one', '2024-01-01T00:00:00Z'), row('r2', 'two', '2024-01-02T00:00:00Z')],
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
    const calls = seedByFilter({ community: [row('p1', 'pub')] });
    const dash = createDashboard();
    await dash.init();
    await dash.setFilter('community');

    const before = calls.filter(c => c.filter === 'community').length;
    await dash.fork('p1');

    expect(mockMutation).toHaveBeenCalledWith('projects:forkProject', { projectId: 'p1' });
    expect(calls.filter(c => c.filter === 'community').length).toBeGreaterThan(before);
  });
});

// ponytail: the Sort suite (dashboard-sort.test.ts) owns sort behavior;
// this file owns filter dispatch + restore/fork/trash side-effects.
