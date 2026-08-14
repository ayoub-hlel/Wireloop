import { goto } from '$app/navigation';
import type { Project } from '../../../types/models';
import { onErrorMessage } from '../../../help/alerts';
import { getApiClient } from '../../../stores/api.client';
import orgStore from '../../../stores/org.store';
import { SvelteSet } from 'svelte/reactivity';
import projectStore from '../../../stores/project.store';
import debounce from 'lodash/debounce';

export interface DashboardProject {
  id: string;
  name: string;
  updatedAt: Date | string;
  lastOpenedAt?: Date | string | null;
  boardType?: string;
  thumbnailUrl?: string | null;
  forkedFrom?: string | null;
  isForked?: boolean;
  deletedByName?: string | null;
  creatorName?: string | null;
  originalName?: string | null;
}

// ponytail: Recents/Resources removed. Filters = starred, community, projects, trash.
// projects/trash are scoped to personal (orgId=null) or the selected org (orgId set).
export type DashboardFilter = 'starred' | 'community' | 'projects' | 'trash';

function mapProject(row: unknown): DashboardProject {
  const p = row as Record<string, unknown>;
  return {
    id: String(p.id),
    name: String(p.name),
    updatedAt: p.updatedAt as string,
    lastOpenedAt: p.lastOpenedAt as string | null | undefined,
    boardType: p.boardType as string | undefined,
    thumbnailUrl: p.thumbnailUrl as string | null | undefined,
    forkedFrom: p.forkedFrom as string | null | undefined,
    isForked: p.isForked as boolean | undefined,
    deletedByName: p.deletedByName as string | null | undefined,
    creatorName: p.creatorName as string | null | undefined,
    originalName: p.originalName as string | null | undefined,
  };
}

function toTime(x: Date | string): number {
  return typeof x === 'string' ? Date.parse(x) : x.getTime();
}

function client() {
  return getApiClient();
}

// ponytail: pure throttle for focus/visibility refetches — focus and
// visibilitychange fire together on tab return; one refetch per window is enough.
export function shouldRefetch(lastRefetch: number, now: number, cooldownMs = 2000): boolean {
  return now - lastRefetch >= cooldownMs;
}

export function createDashboard() {
  let projects = $state<DashboardProject[]>([]);
  // SvelteSet is already reactive — mutate it in place, never reassign.
  const starredIds = new SvelteSet<string>();
  let orgId = $state<string | null>(null);
  let loading = $state(false);
  let initialized = $state(false);
  let _filter = $state<DashboardFilter>('projects');
  let _search = $state('');
  let _view = $state<'grid' | 'list'>('grid');
  let _sort = $state<'updatedAt' | 'lastOpenedAt' | 'name'>('updatedAt');
  let seq = 0;
  let _debouncedSearch = $state('');
  let _sortDir = $state<'asc' | 'desc'>('desc');
  const applySearch = debounce((v: string) => { _debouncedSearch = v; }, 250);

  const collator = new Intl.Collator(undefined, { sensitivity: 'base' });
  const visible: DashboardProject[] = $derived.by(() => {
    let list = projects;
    const q = _debouncedSearch.trim().toLowerCase();
    if (q) list = list.filter(p => p.name.toLowerCase().includes(q));
    const dir = _sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      if (_sort === 'name') return collator.compare(a.name, b.name) * dir;
      if (_sort === 'lastOpenedAt') {
        const ta = a.lastOpenedAt ? toTime(a.lastOpenedAt) : 0;
        const tb = b.lastOpenedAt ? toTime(b.lastOpenedAt) : 0;
        return (ta - tb) * dir;
      }
      return (toTime(a.updatedAt) - toTime(b.updatedAt)) * dir;
    });
  });

  function setSort(col: 'updatedAt' | 'lastOpenedAt' | 'name'): void {
    if (_sort === col) {
      _sortDir = _sortDir === 'asc' ? 'desc' : 'desc';
    } else {
      _sort = col;
      _sortDir = col === 'name' ? 'asc' : 'desc';
    }
  }

  // ponytail: one API call, filter + orgId drive everything. No per-filter endpoints.
  async function fetchList(): Promise<void> {
    loading = true;
    seq += 1;
    const mySeq = seq;
    try {
      const rows = (await client().query('projects:list', { filter: _filter, orgId })) as unknown[];
      if (mySeq !== seq) return;
      projects = (rows ?? []).map(mapProject);
    } catch (e) {
      onErrorMessage('Failed to load projects', e);
    } finally {
      if (mySeq === seq) loading = false;
    }
  }

  async function setFilter(filter: DashboardFilter): Promise<void> {
    if (_filter === filter) return;
    _filter = filter;
    // ponytail: switching to a personal-scoped filter clears org; org filters keep it.
    if (filter === 'starred' || filter === 'community') {
      orgId = null;
      orgStore.setSelectedOrg(null);
    }
    _debouncedSearch = '';
    _search = '';
    await fetchList();
  }

  async function setOrg(nextOrgId: string | null): Promise<void> {
    if (orgId === nextOrgId) return;
    orgId = nextOrgId;
    orgStore.setSelectedOrg(nextOrgId);
    // ponytail: picking an org means "show me that org's projects". Switch from
    // global filters (starred/community) to projects so content follows the org.
    if (_filter === 'starred' || _filter === 'community') {
      _filter = 'projects';
    }
    await fetchList();
  }

  async function init(): Promise<void> {
    if (initialized) return;
    initialized = true;
    loading = true;
    seq += 1;
    const mySeq = seq;
    // ponytail: orgs, starred ids, and the active list are independent — fire
    // them in parallel instead of serially awaiting each one.
    const [starredRes, , listRes] = await Promise.allSettled([
      client().query('projects:list', { filter: 'starred' }) as Promise<unknown>,
      orgStore.fetchOrgs(),
      client().query('projects:list', { filter: _filter, orgId }) as Promise<unknown>,
    ]);
    if (mySeq !== seq) return;
    if (starredRes.status === 'fulfilled' && starredRes.value) {
      starredIds.clear();
      for (const r of starredRes.value as DashboardProject[]) starredIds.add(r.id);
    }
    if (listRes.status === 'fulfilled') {
      projects = ((listRes.value ?? []) as unknown[]).map(mapProject);
    } else {
      onErrorMessage('Failed to load dashboard', listRes.reason);
    }
    loading = false;
  }

  async function toggleStar(projectId: string): Promise<void> {
    const isStarred = starredIds.has(projectId);
    try {
      await client().mutation(isStarred ? 'projects:unstarProject' : 'projects:starProject', { projectId });
      if (isStarred) starredIds.delete(projectId);
      else starredIds.add(projectId);
    } catch (e) {
      onErrorMessage(isStarred ? 'Failed to unstar project' : 'Failed to star project', e);
    }
  }

  async function trash(projectId: string): Promise<void> {
    try {
      await client().mutation('projects:trashProject', { projectId });
      if (_filter === 'trash') {
        await fetchList();
      } else {
        projects = projects.filter(p => p.id !== projectId);
      }
    } catch (e) {
      onErrorMessage('Failed to trash project', e);
    }
  }

  async function restore(projectId: string): Promise<void> {
    try {
      await client().mutation('projects:restoreProject', { projectId });
      if (_filter === 'trash') {
        await fetchList();
      }
    } catch (e) {
      onErrorMessage('Failed to restore project', e);
    }
  }

  async function fork(projectId: string): Promise<void> {
    try {
      await client().mutation('projects:forkProject', { projectId });
      if (_filter === 'projects' || _filter === 'community') {
        await fetchList();
      }
    } catch (e) {
      onErrorMessage('Failed to fork project', e);
    }
  }

  // ── Staleness tolerance: trigger-based re-fetch ──────────────────
  // No polling, no WebSocket. Re-read on tab-visible + window-focus,
  // throttled to one refetch per cooldown window (the two events fire
  // together on tab return) and never stacked on an in-flight fetch.
  let _visHandler: (() => void) | null = null;
  let _focusHandler: (() => void) | null = null;
  let _lastRefetch = 0;

  async function refetchIfStale(): Promise<void> {
    const now = Date.now();
    if (!shouldRefetch(_lastRefetch, now)) return;
    _lastRefetch = now;
    if (loading) return;
    await fetchList();
  }

  function startInvalidation() {
    if (typeof document === 'undefined') return;
    _visHandler = () => { if (document.visibilityState === 'visible') void refetchIfStale(); };
    document.addEventListener('visibilitychange', _visHandler);
    _focusHandler = () => void refetchIfStale();
    window.addEventListener('focus', _focusHandler);
  }

  function stopInvalidation() {
    if (_visHandler) document.removeEventListener('visibilitychange', _visHandler);
    if (_focusHandler) window.removeEventListener('focus', _focusHandler);
    _visHandler = null;
    _focusHandler = null;
  }

  async function open(projectId: string): Promise<void> {
    const project = (await client().query('projects:getProject', { projectId })) as Project | null;
    if (!project) { onErrorMessage('Project not found'); return; }

    const file = (await client().query('projects:getProjectFile', { projectId })) as { content?: string } | null;
    const workspace = file?.content ?? '';

    if (workspace) {
      const { loadProject } = await import('../../../core/blockly/helpers/workspace.helper');
      loadProject(workspace);
    }

    projectStore.set({ project, projectId });
    await goto(`/studio?projectid=${encodeURIComponent(projectId)}`);
  }

  return {
    get projects() { return projects; },
    get starredIds() { return starredIds; },
    get orgId() { return orgId; },
    get filter() { return _filter; },
    get loading() { return loading; },
    get search() { return _search; },
    set search(v) { _search = v; applySearch(v); },
    get view() { return _view; },
    set view(v) { _view = v as 'grid' | 'list'; },
    get sort() { return _sort; },
    get sortDir() { return _sortDir; },
    get visible() { return visible; },
    init,
    startInvalidation,
    stopInvalidation,
    setFilter,
    setOrg,
    setSort,
    toggleStar,
    trash,
    restore,
    fork,
    open,
  };
}
