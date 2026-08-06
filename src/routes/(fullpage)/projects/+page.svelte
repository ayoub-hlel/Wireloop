<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';

  import Sidebar from './Sidebar.svelte';
  import GridToolbar from './GridToolbar.svelte';
  import ProjectGrid from './ProjectGrid.svelte';
  import ProjectList from './ProjectList.svelte';
  import UserSettingsDialog from '$lib/components/app/UserSettingsDialog.svelte';
  import ImportDialog from '$lib/components/app/ImportDialog.svelte';
  import CreateProjectDialog from '$lib/components/app/CreateProjectDialog.svelte';
  import orgStore, { type OrgInfo } from '../../../stores/org.store';
  import authStore from '../../../stores/auth.store';
  import { createDashboard } from './dashboard.svelte.ts';

  const unSubList: (() => void)[] = [];

  let orgs = $state<OrgInfo[]>([]);
  let selectedOrgId = $state<string | null>(null);
  let isLoggedIn = $state(false);
  let userName = $state('');
  let userEmail = $state('');
  let userImage = $state<string | null>(null);

  const dashboard = createDashboard();

  let settingsOpen = $state(false);
  let importOpen = $state(false);
  let createOpen = $state(false);

  let unSubAuth: (() => void) | null = null;
  let unSubOrg: (() => void) | null = null;

  const filterTitles: Record<string, string> = {
    recents: 'Recents',
    projects: 'Projects',
    community: 'Community',
    resources: 'Resources',
    trash: 'Trash',
    starred: 'Starred',
  };

  onMount(() => {
    unSubAuth = authStore.subscribe(async (auth) => {
      isLoggedIn = auth.isLoggedIn;
      if (auth.isLoggedIn) {
        userName = auth.user?.name ?? '';
        userEmail = auth.user?.email ?? '';
        userImage = auth.user?.image ?? null;
        await dashboard.init();
      }
    });

    unSubOrg = orgStore.subscribe(state => {
      orgs = state.orgs;
      selectedOrgId = state.selectedOrgId;
    });

    unSubList.push(unSubAuth);
    unSubList.push(unSubOrg);
  });

  onDestroy(() => {
    unSubList.forEach((s) => s());
  });

  async function openProject(projectId: string) {
    if (!projectId) return;
    await dashboard.open(projectId);
  }

  async function onSelectOrg(orgId: string | null) {
    selectedOrgId = orgId;
    await dashboard.setOrg(orgId);
  }

  async function handleSignOut() {
    await authStore.signOut();
    await goto('/login');
  }
</script>

<svelte:head>
  <title>Wireloop - Projects</title>
</svelte:head>

<Sidebar
  {userName}
  {userEmail}
  {userImage}
  {orgs}
  bind:selectedOrgId
  filter={dashboard.filter}
  {onSelectOrg}
  onFilterChange={(f) => dashboard.setFilter(f)}
  onSignOut={handleSignOut}
  onOpenSettings={() => (settingsOpen = true)}
  onNewProject={() => (createOpen = true)}
/>

<UserSettingsDialog bind:open={settingsOpen} />
<ImportDialog bind:open={importOpen} />
<CreateProjectDialog bind:open={createOpen} />

<div class="main-area">
  <header class="main-header">
    <div class="header-left">
      <h1 class="page-title">{filterTitles[dashboard.filter]}</h1>
    </div>

    <div class="header-right">
      <button class="upload-btn" onclick={() => (importOpen = true)}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        Import
      </button>
    </div>
  </header>

  <main class="main-content">
    <!-- ponytail: toolbar lives outside the results conditional so search/sort/view
         never vanish while a filter loads or returns zero rows. -->
    <GridToolbar
      view={dashboard.view}
      sort={dashboard.sort}
      search={dashboard.search}
      onViewChange={(v) => dashboard.view = v}
      onSortChange={(s) => dashboard.setSort(s)}
      onSearch={(q) => dashboard.search = q}
    />

    {#if dashboard.loading}
      <div class="grid-loading">
        <div class="loading-spinner"></div>
      </div>
    {:else if dashboard.visible.length > 0}
      {#if dashboard.view === 'grid'}
        <ProjectGrid
          projects={dashboard.visible}
          starredIds={[...dashboard.starredIds]}
          trashed={dashboard.filter === 'trash'}
          onOpen={(id) => openProject(id)}
          onStar={(id) => dashboard.toggleStar(id)}
          onFork={(id) => dashboard.fork(id)}
          onTrash={(id) => dashboard.trash(id)}
          onRestore={(id) => dashboard.restore(id)}
        />
      {:else}
        <ProjectList
          projects={dashboard.visible}
          starredIds={[...dashboard.starredIds]}
          sort={dashboard.sort}
          sortDir={dashboard.sortDir}
          trashed={dashboard.filter === 'trash'}
          onSortChange={(s) => dashboard.setSort(s)}
          onOpen={(id) => openProject(id)}
          onStar={(id) => dashboard.toggleStar(id)}
          onTrash={(id) => dashboard.trash(id)}
          onRestore={(id) => dashboard.restore(id)}
        />
      {/if}
    {:else if isLoggedIn}
      <section class="empty-state">
        <p>
          {#if dashboard.filter === 'trash'}
            Trash is empty.
          {:else if dashboard.filter === 'community'}
            No public projects yet.
          {:else}
            No projects here yet.
          {/if}
        </p>
      </section>
    {/if}
  </main>
</div>

<style>
  .main-area {
    margin-left: 16rem;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background-color: hsl(var(--background));
  }

  .main-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1.5rem;
    border-bottom: 1px solid hsl(var(--border));
    background-color: hsl(var(--background));
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .page-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
    color: hsl(var(--foreground));
  }

  .upload-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.375rem;
    background-color: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .upload-btn:hover {
    opacity: 0.9;
  }

  .main-content {
    flex: 1;
    padding: 1.5rem;
    overflow-y: auto;
  }

  .grid-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
  }

  .loading-spinner {
    width: 2rem;
    height: 2rem;
    border-radius: 9999px;
    border: 2px solid hsl(var(--border));
    border-top-color: hsl(var(--primary));
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    color: hsl(var(--muted-foreground));
    text-align: center;
  }

  .empty-state p {
    max-width: 24rem;
  }
</style>
