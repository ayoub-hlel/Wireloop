<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import { goto } from '$app/navigation';

  import Sidebar from './Sidebar.svelte';
  import GridToolbar from './GridToolbar.svelte';
  import ProjectGrid from './ProjectGrid.svelte';
  import ProjectList from './ProjectList.svelte';
  import UserSettingsDialog from '$lib/components/app/UserSettingsDialog.svelte';
  import CreateOrganizationDialog from '$lib/components/orgs/CreateOrganizationDialog.svelte';
  import SkeletonCard from './SkeletonCard.svelte';
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import orgStore, { type OrgInfo } from '../../../stores/org.store';
  import authStore from '../../../stores/auth.store';
  import { createDashboard } from './dashboard.svelte.ts';
  import { getApiClient } from '../../../stores/api.client';

  const unSubList: (() => void)[] = [];

  let orgs = $state<OrgInfo[]>([]);
  let selectedOrgId = $state<string | null>(null);
  let isLoggedIn = $state(false);
  let userName = $state('');
  let userEmail = $state('');
  let userImage = $state<string | null>(null);

  const dashboard = createDashboard();

  let settingsOpen = $state(false);
  let createOrgOpen = $state(false);
  let trashConfirmId = $state<string | null>(null);

  // ponytail: canCreate = personal (always) OR org where role >= admin.
  // viewers and users can't create; button is hidden.
  let orgRole = $state<string | null>(null);
  let canCreate = $derived(!selectedOrgId || orgRole === 'admin' || orgRole === 'owner');

  let unSubAuth: (() => void) | null = null;
  let unSubOrg: (() => void) | null = null;
  let meId: string | null = null;

  // ponytail: role per org is stable for the page lifetime — cache it so
  // revisiting an org (or the orgStore emit + onSelectOrg double-fire) doesn't
  // re-run org:getMembers (a full member list with profile joins) per selection.
  const roleCache = new SvelteMap<string, string | null>();

  async function fetchOrgRole(orgId: string | null) {
    if (!orgId) { orgRole = null; return; }
    if (roleCache.has(orgId)) { orgRole = roleCache.get(orgId) ?? null; return; }
    try {
      // ponytail: getMembers returns [] if not a member; otherwise infer role from membership.
      const members = (await getApiClient().query('org:getMembers', { orgId })) as Array<{ userId: string; role: string }>;
      const mine = members.find(m => m.userId === meId);
      const role = mine?.role ?? null;
      roleCache.set(orgId, role);
      orgRole = role;
    } catch { orgRole = null; }
  }

  let currentOrgName = $derived(
    selectedOrgId ? orgs.find(o => o.id === selectedOrgId)?.name ?? null : null
  );

  let pageTitle = $derived.by(() => {
    if (dashboard.filter === 'starred') return 'Starred';
    if (dashboard.filter === 'community') return 'Community';
    const scope = currentOrgName ?? 'Personal';
    const kind = dashboard.filter === 'trash' ? 'Trash' : 'Projects';
    return `${scope} ${kind}`;
  });


  onMount(() => {
    unSubAuth = authStore.subscribe(async (auth) => {
      isLoggedIn = auth.isLoggedIn;
      if (auth.isLoggedIn) {
        userName = auth.user?.name ?? '';
        userEmail = auth.user?.email ?? '';
        userImage = auth.user?.image ?? null;
        meId = auth.user?.id ?? null;
        await dashboard.init();
      }
    });

    unSubOrg = orgStore.subscribe(state => {
      orgs = state.orgs;
      selectedOrgId = state.selectedOrgId;
      fetchOrgRole(state.selectedOrgId);
    });

    unSubList.push(unSubAuth);
    unSubList.push(unSubOrg);
  });

  onMount(() => {
    dashboard.startInvalidation();
  });

  onDestroy(() => {
    dashboard.stopInvalidation();
    unSubList.forEach((s) => s());
  });

  async function openProject(projectId: string) {
    if (!projectId) return;
    await dashboard.open(projectId);
  }

  async function onSelectOrg(orgId: string | null) {
    selectedOrgId = orgId;
    // orgStore emit drives fetchOrgRole via the subscription — no second call here.
    await dashboard.setOrg(orgId);
  }

  // ponytail: creation happens in the studio, which needs the org scope —
  // carry the selected org in the URL so the save flow can assign it.
  function goCreate() {
    goto(selectedOrgId ? `/studio?orgId=${encodeURIComponent(selectedOrgId)}` : '/studio');
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
  {canCreate}
  {onSelectOrg}
  onFilterChange={(f) => dashboard.setFilter(f)}
  onSignOut={handleSignOut}
  onOpenSettings={() => (settingsOpen = true)}
   onNewProject={goCreate}
  onCreateOrg={() => (createOrgOpen = true)}
/>

<UserSettingsDialog bind:open={settingsOpen} />
<CreateOrganizationDialog bind:open={createOrgOpen} onSuccess={(orgId) => dashboard.setOrg(orgId)} />

<!-- Trash confirmation -->
<Dialog.Root open={trashConfirmId !== null} onOpenChange={(o) => { if (!o) trashConfirmId = null; }}>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content class="sm:max-w-md">
      <Dialog.Header>
        <Dialog.Title>Delete project?</Dialog.Title>
        <Dialog.Description>
          This project will be moved to trash. You can restore it from the Trash section.
        </Dialog.Description>
      </Dialog.Header>
      <Dialog.Footer>
        <Button variant="outline" onclick={() => trashConfirmId = null}>Cancel</Button>
        <Button variant="destructive" onclick={() => { if (trashConfirmId) dashboard.trash(trashConfirmId); trashConfirmId = null; }}>
          Delete
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<div class="main-area">
  <header class="main-header">
    <div class="header-left">
      <h1 class="page-title">{pageTitle}</h1>
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
      <div class="skeleton-grid">
        {#each Array(6) as _, i (i)}
          <SkeletonCard />
        {/each}
      </div>
    {:else if dashboard.visible.length > 0}
      {#if dashboard.view === 'grid'}
        <ProjectGrid
          projects={dashboard.visible}
          starredIds={[...dashboard.starredIds]}
          trashed={dashboard.filter === 'trash'}
          context={dashboard.filter}
          onOpen={(id) => openProject(id)}
          onStar={(id) => dashboard.toggleStar(id)}
          onFork={(id) => dashboard.fork(id)}
          onTrash={(id) => trashConfirmId = id}
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
        {#if dashboard.filter === 'trash'}
          <div class="empty-illustration">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </div>
          <p class="empty-title">Trash is empty</p>
          <p class="empty-subtitle">Deleted projects will appear here.</p>
        {:else if dashboard.filter === 'community'}
          <div class="empty-illustration">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <p class="empty-title">No community projects yet</p>
          <p class="empty-subtitle">Projects shared by others will appear here.</p>
        {:else}
          <div class="empty-illustration">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <p class="empty-title">No projects yet</p>
          <p class="empty-subtitle">Create your first project to get started.</p>
          {#if canCreate}
            <Button class="empty-cta" onclick={goCreate}>
              Create Project
            </Button>
          {/if}
        {/if}
      </section>
    {/if}
  </main>
</div>

<style>
  .main-area { margin-left: 200px; display: flex; flex-direction: column; min-height: 100vh; background-color: hsl(var(--background)); transition: margin-left 200ms ease; }
  .main-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 2rem; border-bottom: 1px solid hsl(var(--border)); background-color: hsl(var(--background)); }
  .header-left { display: flex; align-items: center; gap: 0.75rem; }
  .page-title { font-size: 1.5rem; font-weight: 600; margin: 0; color: hsl(var(--foreground)); letter-spacing: -0.02em; }
  .main-content { flex: 1; padding: 2rem; overflow-y: auto; padding-bottom: 5rem; }

  .skeleton-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, var(--project-card-width));
    gap: 1.5rem;
  }

  @media (max-width: 768px) {
    .skeleton-grid {
      grid-template-columns: var(--project-card-width);
      gap: 1rem;
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 1rem;
    text-align: center;
  }

  .empty-illustration {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    border-radius: 1rem;
    background-color: hsl(var(--muted));
    color: hsl(var(--muted-foreground));
    margin-bottom: 1.25rem;
  }

  .empty-title {
    margin: 0 0 0.375rem;
    font-size: 1rem;
    font-weight: 600;
    color: hsl(var(--foreground));
  }

  .empty-subtitle {
    margin: 0;
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
    max-width: 20rem;
  }

  :global(.empty-cta) {
    margin-top: 1.5rem;
  }

  @media (max-width: 768px) {
    .main-area { margin-left: 0; }
    .main-header { padding: 1rem; }
    .main-content { padding: 1rem; padding-bottom: 5rem; }
  }
</style>
