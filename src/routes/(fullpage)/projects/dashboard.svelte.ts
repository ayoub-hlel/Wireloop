import { goto } from '$app/navigation';
import { onErrorMessage } from '../../../help/alerts';
import { loadProject } from '../../../core/blockly/helpers/workspace.helper';
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

function client() {
  return getApiClient();
}

export function createDashboard() {
  let projects = $state<DashboardProject[]>([]);
  let starred = $state<DashboardProject[]>([]);
  let trashed = $state<DashboardProject[]>([]);
  let orgId = $state<string | null>(null);
  let loading = $state(false);
  let initialized = $state(false);
  let _search = $state('');
  let _view = $state<'grid' | 'list'>('grid');
  let _sort = $state<'updatedAt' | 'name'>('updatedAt');
  let seq = 0;
  let _debouncedSearch = $state('');
  let _sortDir = $state<'asc' | 'desc'>('desc');
  const applySearch = debounce((v: string) => { _debouncedSearch = v; }, 250);

  const collator = new Intl.Collator(undefined, { sensitivity: 'base' });
  let visible = $derived.by(() => {
    let list = projects;
    const q = _debouncedSearch.trim().toLowerCase();
    if (q) list = list.filter(p => p.name.toLowerCase().includes(q));
    const dir = _sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      if (_sort === 'name') return collator.compare(a.name, b.name) * dir;
      return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * dir;
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

  async function fetchSidebarData(): Promise<void> {
    const [draftsRes, starredRes, trashedRes] = await Promise.allSettled([
      client().query('projects:getDrafts', {}),
      client().query('projects:getStarredProjects', {}),
      client().query('projects:getTrashedProjects', {}),
    ]);

    if (draftsRes.status === 'fulfilled') {
      projects = ((draftsRes.value as unknown[]) ?? []).map(mapProject);
    }
    if (starredRes.status === 'fulfilled') {
      starred = ((starredRes.value as unknown[]) ?? []).map(mapProject);
    }
    if (trashedRes.status === 'fulfilled') {
      trashed = ((trashedRes.value as unknown[]) ?? []).map(mapProject);
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
      // org fetch failure is non-fatal; projects may still work for personal scope
    }

    try {
      await fetchSidebarData();
    } catch (e) {
      onErrorMessage('Failed to load dashboard', e);
    } finally {
      if (mySeq === seq) loading = false;
    }

    if (initOrgId !== undefined) {
      await setOrg(initOrgId);
    }
  }

  async function setOrg(nextOrgId: string | null): Promise<void> {
    if (orgId === nextOrgId) return;
    orgId = nextOrgId;
    orgStore.setSelectedOrg(nextOrgId);

    loading = true;
    seq += 1;
    const mySeq = seq;

    try {
      let result: unknown[];
      if (nextOrgId) {
        result = (await client().query('org:getOrgProjects', { orgId: nextOrgId })) as unknown[];
      } else {
        result = (await client().query('projects:getDrafts', {})) as unknown[];
      }
      if (mySeq !== seq) return;
      projects = (result ?? []).map(mapProject);
    } catch (e) {
      onErrorMessage('Failed to load projects', e);
    } finally {
      if (mySeq === seq) loading = false;
    }
  }

  async function toggleStar(projectId: string): Promise<void> {
    const isStarred = starred.some(p => p.id === projectId);
    try {
      await client().mutation(isStarred ? 'projects:unstarProject' : 'projects:starProject', { projectId });
      const refreshed = (await client().query('projects:getStarredProjects', {})) as unknown[];
      starred = (refreshed ?? []).map(mapProject);
    } catch (e) {
      onErrorMessage(isStarred ? 'Failed to unstar project' : 'Failed to star project', e);
    }
  }

  async function trash(projectId: string): Promise<void> {
    try {
      await client().mutation('projects:trashProject', { projectId });
      const moved = projects.find(p => p.id === projectId) ?? starred.find(p => p.id === projectId);
      if (moved) {
        trashed = [moved, ...trashed];
      }
      projects = projects.filter(p => p.id !== projectId);
      starred = starred.filter(p => p.id !== projectId);
    } catch (e) {
      onErrorMessage('Failed to trash project', e);
    }
  }

  async function restore(projectId: string): Promise<void> {
    try {
      await client().mutation('projects:restoreProject', { projectId });
      const moved = trashed.find(p => p.id === projectId);
      if (moved) {
        projects = [moved, ...projects];
      }
      trashed = trashed.filter(p => p.id !== projectId);
      const refreshed = (await client().query('projects:getStarredProjects', {})) as unknown[];
      starred = (refreshed ?? []).map(mapProject);
    } catch (e) {
      onErrorMessage('Failed to restore project', e);
    }
  }

  async function fork(projectId: string): Promise<void> {
    try {
      await client().mutation('projects:forkProject', { projectId });
      if (orgId === null) {
        const data = (await client().query('projects:getDrafts', {})) as unknown[];
        projects = (data ?? []).map(mapProject);
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

    const project = (await client().query('projects:getProject', { projectId })) as Record<string, unknown> | null;
    if (!project) {
      onErrorMessage('Project not found');
      return;
    }

    const file = (await client().query('projects:getProjectFile', { projectId })) as { content?: string } | null;
    const workspace = file?.content ?? '';

    if (workspace) {
      loadProject(workspace);
    }

    projectStore.set({ project, projectId, isLoading: false, error: null });
    await goto(`/studio?projectid=${encodeURIComponent(projectId)}`);
  }

  return {
    get projects() { return projects; },
    get starred() { return starred; },
    get trashed() { return trashed; },
    get orgId() { return orgId; },
    get loading() { return loading; },
    get search() { return _search; },
    set search(v) { _search = v; applySearch(v); },
    get view() { return _view; },
    set view(v) { _view = v as 'grid' | 'list'; },
    get sort() { return _sort; },
    get sortDir() { return _sortDir; },
    get visible() { return visible; },
    init,
    setOrg,
    setSort,
    toggleStar,
    trash,
    restore,
    fork,
    open,
  };
}
