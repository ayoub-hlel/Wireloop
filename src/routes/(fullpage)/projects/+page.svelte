<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { lessons } from '../../../lessons/lessons';
  import type { LessonContainer, Lesson } from '../../../lessons/lessons';

  import chunk from 'lodash/chunk';

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
  let lessonList: Lesson[] = lessons.reduce((acc: Lesson[], lessonContainer: LessonContainer) => {
    return [...acc, ...lessonContainer.lessons];
  }, []);

  let orgs = $state<OrgInfo[]>([]);
  let selectedOrgId = $state<string | null>(null);
  let isLoggedIn = $state(false);
  let userName = $state('');
  let userEmail = $state('');
  let userImage = $state<string | null>(null);

  const dashboard = createDashboard();
  let searchTerm = $state('');
  let trash = $derived(dashboard.trashed.map(p => ({ id: p.id, name: p.name })));
  let starred = $derived(dashboard.starred.map(p => ({ id: p.id, name: p.name })));

  let settingsOpen = $state(false);
  let importOpen = $state(false);
  let createOpen = $state(false);

  let unSubAuth: (() => void) | null = null;
  let unSubOrg: (() => void) | null = null;

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
  bind:searchTerm
  {orgs}
  bind:selectedOrgId
  {onSelectOrg}
  {trash}
  {starred}
  onSignOut={handleSignOut}
  onRestore={(id) => dashboard.restore(id)}
  onOpenSettings={() => (settingsOpen = true)}
  onNewProject={() => (createOpen = true)}
/>

<UserSettingsDialog bind:open={settingsOpen} />
<ImportDialog bind:open={importOpen} />
<CreateProjectDialog bind:open={createOpen} />

<div class="main-area">
  <header class="main-header">
    <div class="header-left">
      <h1 class="page-title">Projects</h1>
    </div>

    <div class="header-right">
      <button class="upload-btn" onclick={() => (importOpen = true)}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        Import
      </button>
    </div>
  </header>

  <main class="main-content">
    {#if dashboard.visible.length > 0}
      <GridToolbar
        view={dashboard.view}
        sort={dashboard.sort}
        onViewChange={(v) => dashboard.view = v}
        onSortChange={(s) => dashboard.setSort(s)}
        onSearch={(q) => dashboard.search = q}
      />

      {#if dashboard.view === 'grid'}
        <ProjectGrid
          projects={dashboard.visible}
          starredIds={dashboard.starred.map(p => p.id)}
          onOpen={(id) => openProject(id)}
          onStar={(id) => dashboard.toggleStar(id)}
          onFork={(id) => dashboard.fork(id)}
          onTrash={(id) => dashboard.trash(id)}
        />
      {:else}
        <ProjectList
          projects={dashboard.visible}
          starredIds={dashboard.starred.map(p => p.id)}
          sort={dashboard.sort}
          sortDir={dashboard.sortDir}
          onSortChange={(s) => dashboard.setSort(s)}
          onOpen={(id) => openProject(id)}
          onStar={(id) => dashboard.toggleStar(id)}
          onTrash={(id) => dashboard.trash(id)}
        />
      {/if}
    {:else if isLoggedIn}
      <section class="empty-state">
        <p>No projects yet. Import one above or start with a demo project below.</p>
      </section>
    {/if}

    <section class="demo-section">
      <div class="demo-header">
        <h2>Demo Projects</h2>
        <div class="demo-legend">
          <span class="legend-item"><img src="/example-projects/easy.png" alt="" class="legend-icon" /> Easy</span>
          <span class="legend-item"><img src="/example-projects/medium.png" alt="" class="legend-icon" /> Medium</span>
          <span class="legend-item"><img src="/example-projects/hard.png" alt="" class="legend-icon" /> Hard</span>
        </div>
      </div>

      {#each chunk(lessonList, 3) as lessonRow, ri (ri)}
        <div class="demo-row">
          {#each lessonRow as lesson, li (li)}
            <div
              class="demo-card"
              onclick={() => goto(`/studio?example_project=${lesson.file}`)}
              onkeydown={(e) => e.key === 'Enter' && goto(`/studio?example_project=${lesson.file}`)}
              role="button"
              tabindex="0"
            >
              <div class="demo-card-body">
                <img loading="lazy" src={lesson.levelImage} alt="difficulty" class="demo-level" />
                <h5>{lesson.title}</h5>
              </div>
              <img src={lesson.image} class="demo-card-img" alt={lesson.title} />
            </div>
          {/each}
        </div>
      {/each}
    </section>
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

  .demo-section {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid hsl(var(--border));
  }

  .demo-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
  }

  .demo-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .demo-legend {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8rem;
    color: hsl(var(--muted-foreground));
  }

  .legend-icon {
    width: 20px;
    height: 20px;
  }

  .demo-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .demo-card {
    border: 1px solid hsl(var(--border));
    border-radius: 0.5rem;
    overflow: hidden;
    cursor: pointer;
    transition: box-shadow 0.15s;
    background-color: hsl(var(--card));
  }

  .demo-card:hover {
    box-shadow: 0 4px 12px hsl(var(--shadow) / 0.1);
  }

  .demo-card:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
  }

  .demo-card-body {
    position: relative;
    padding: 1rem;
  }

  .demo-level {
    position: absolute;
    right: 0.75rem;
    top: 0.75rem;
    width: 24px;
    height: 24px;
  }

  .demo-card-body h5 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    padding-right: 2rem;
  }

  .demo-card-img {
    width: 100%;
    height: 200px;
    object-fit: cover;
    display: block;
  }
</style>
