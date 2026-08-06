import { goto } from '$app/navigation';
import type { Project } from '../../../types/models';
import { onErrorMessage } from '../../../help/alerts';
import { getApiClient } from '../../../stores/api.client';
import orgStore from '../../../stores/org.store';
import projectStore from '../../../stores/project.store';
import debounce from 'lodash/debounce';

export interface DashboardProject {
  id: string;
  name: string;
  updatedAt: Date | string;
  boardType?: string;
  thumbnailUrl?: string | null;
  forkedFrom?: string | null;
}

export type DashboardFilter = 'recents' | 'projects' | 'community' | 'resources' | 'trash' | 'starred';

function mapProject(row: unknown): DashboardProject {
  const p = row as Record<string, unknown>;
  return {
    id: String(p.id),
    name: String(p.name),
    updatedAt: p.updatedAt as string,
    boardType: p.boardType as string | undefined,
    thumbnailUrl: p.thumbnailUrl as string | null | undefined,
    forkedFrom: p.forkedFrom as string | null | undefined,
  };
}

function toTime(x: Date | string): number {
  return typeof x === 'string' ? Date.parse(x) : x.getTime();
}

function client() {
  return getApiClient();
}

// ponytail: one-shot fetch per filter; no pagination, no prefetching.
// Add when you have 1000+ projects. YAGNI.

export function createDashboard() {
  let projects = $state<DashboardProject[]>([]);
  let starredIds = $state<Set<string>>(new Set());
  let orgId = $state<string | null>(null);
  let loading = $state(false);
  let initialized = $state(false);
  let _filter = $state<DashboardFilter>('recents');
  let _search = $state('');
  let _view = $state<'grid' | 'list'>('grid');
  let _sort = $state<'updatedAt' | 'name'>('updatedAt');
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
      return (toTime(a.updatedAt) - toTime(b.updatedAt)) * dir;
    });
  });

  function setSort(col: 'updatedAt' | 'name'): void {
    if (_sort === col) {
      _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      _sort = col;
      _sortDir = col === 'name' ? 'asc' : 'desc';
    }
  }

  async function fetchList(filter: DashboardFilter): Promise<void> {
    loading = true;
    seq += 1;
    const mySeq = seq;
    try {
      let rows: unknown[];
      switch (filter) {
        case 'recents':
          rows = (await client().query('projects:getRecentProjects', {})) as unknown[];
          break;
        case 'projects':
          rows = (await client().query('projects:getDrafts', {})) as unknown[];
          break;
        case 'community':
          rows = (await client().query('projects:getPublicProjects', {})) as unknown[];
          break;
        case 'resources':
          if (!orgId) { rows = []; break; }
          rows = (await client().query('org:getOrgProjects', { orgId })) as unknown[];
          break;
        case 'trash':
          rows = (await client().query('projects:getTrashedProjects', {})) as unknown[];
          break;
        case 'starred':
          rows = (await client().query('projects:getStarredProjects', {})) as unknown[];
          break;
        default:
          rows = [];
      }
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
    // ponytail: unset org when switching away from resources;
    // re-select org from store when coming back.
    if (filter !== 'resources' && orgId !== null) {
      orgId = null;
      orgStore.setSelectedOrg(null);
    }
    _debouncedSearch = '';
    _search = '';
    await fetchList(filter);
  }

  async function setOrg(nextOrgId: string | null): Promise<void> {
    if (orgId === nextOrgId) return;
    orgId = nextOrgId;
    orgStore.setSelectedOrg(nextOrgId);

    if (_filter !== 'resources') return;
    loading = true;
    seq += 1;
    const mySeq = seq;
    try {
      let result: unknown[];
      if (nextOrgId) {
        result = (await client().query('org:getOrgProjects', { orgId: nextOrgId })) as unknown[];
      } else {
        result = [];
      }
      if (mySeq !== seq) return;
      projects = (result ?? []).map(mapProject);
    } catch (e) {
      onErrorMessage('Failed to load projects', e);
    } finally {
      if (mySeq === seq) loading = false;
    }
  }

  async function init(initOrgId?: string): Promise<void> {
    if (initialized) return;
    initialized = true;

    loading = true;
    seq += 1;
    const mySeq = seq;

    try {
      await orgStore.fetchOrgs();
    } catch {
      // org fetch failure is non-fatal
    }

    try {
      const starredRows = (await client().query('projects:getStarredProjects', {})) as unknown[];
      starredIds = new Set(((starredRows ?? []) as DashboardProject[]).map(r => r.id));
    } catch {
      // non-fatal
    }

    try {
      await fetchList('recents');
    } catch (e) {
      onErrorMessage('Failed to load dashboard', e);
    } finally {
      if (mySeq === seq) loading = false;
    }

    if (initOrgId !== undefined) {
      await setOrg(initOrgId);
    }
  }

  async function toggleStar(projectId: string): Promise<void> {
    const isStarred = starredIds.has(projectId);
    try {
      await client().mutation(isStarred ? 'projects:unstarProject' : 'projects:starProject', { projectId });
      if (isStarred) {
        starredIds = new Set([...starredIds].filter(id => id !== projectId));
      } else {
        const next = new Set(starredIds);
        next.add(projectId);
        starredIds = next;
      }
    } catch (e) {
      onErrorMessage(isStarred ? 'Failed to unstar project' : 'Failed to star project', e);
    }
  }

  async function trash(projectId: string): Promise<void> {
    try {
      await client().mutation('projects:trashProject', { projectId });
      if (_filter === 'trash') {
        await fetchList('trash');
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
        await fetchList('trash');
      }
    } catch (e) {
      onErrorMessage('Failed to restore project', e);
    }
  }

  async function fork(projectId: string): Promise<void> {
    try {
      await client().mutation('projects:forkProject', { projectId });
      if (_filter === 'projects') {
        await fetchList('projects');
      } else if (_filter === 'recents') {
        await fetchList('recents');
      } else if (_filter === 'community') {
        await fetchList('community');
      }
    } catch (e) {
      onErrorMessage('Failed to fork project', e);
    }
  }

  async function open(projectId: string): Promise<void> {
    try {
      await client().mutation('projects:trackRecentProject', { projectId });
    } catch {
      // tracking failure should not block navigation
    }

    const project = (await client().query('projects:getProject', { projectId })) as Project | null;
    if (!project) {
      onErrorMessage('Project not found');
      return;
    }

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