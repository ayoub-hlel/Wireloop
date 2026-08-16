<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { fly } from 'svelte/transition';
  import { resetWorkspace, workspaceToXML } from '../../core/blockly/helpers/workspace.helper';
  import { createCurrentProject, saveCurrentProject } from '../../stores/project.store';
  import projectStore from '../../stores/project.store';
  import orgStore from '../../stores/org.store';
  import { getApiClient } from '../../stores/api.client';
  import { onErrorMessage } from '../../help/alerts';
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';

  let isDropdownOpen = $state(false);
  let saveStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
  let nameDialogOpen = $state(false);
  let projectNameInput = $state('');
  let resolveProjectName: ((name: string | null) => void) | null = null;
  let confirmDialogOpen = $state(false);
  let confirmMessage = $state('');
  let resolveConfirm: ((confirmed: boolean) => void) | null = null;

  let projectName = $derived($projectStore.project?.name ?? 'Untitled');
  let projectOrgId = $derived($projectStore.project?.orgId ?? $page.url.searchParams.get('orgId'));
  let projectScope = $derived(
    projectOrgId
      ? `Org project · ${$orgStore.orgs.find((org) => org.id === projectOrgId)?.name ?? 'Organization'}`
      : 'Personal project'
  );

  function toggleDropdown() { isDropdownOpen = !isDropdownOpen; }
  function closeDropdown() { isDropdownOpen = false; }

  function requestProjectName(): Promise<string | null> {
    return new Promise((resolve) => {
      resolveProjectName = resolve;
      projectNameInput = '';
      nameDialogOpen = true;
    });
  }

  function finishProjectName(name: string | null) {
    nameDialogOpen = false;
    resolveProjectName?.(name?.trim() || null);
    resolveProjectName = null;
  }

  function requestConfirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      confirmMessage = message;
      resolveConfirm = resolve;
      confirmDialogOpen = true;
    });
  }

  function finishConfirm(confirmed: boolean) {
    confirmDialogOpen = false;
    resolveConfirm?.(confirmed);
    resolveConfirm = null;
  }

  async function saveNewProject(xml: string): Promise<boolean> {
    const name = await requestProjectName();
    if (!name) return false;
    await createCurrentProject(name, xml, $page.url.searchParams.get('orgId'));
    return true;
  }

  // ponytail: exit to projects prompts save/cancel. Save → persist then navigate; Cancel → leave unsaved.
  async function handleExit() {
    closeDropdown();
    if (!$projectStore.projectId) {
      const choice = await requestConfirm("Save this project before leaving?");
      if (choice) {
        try {
          await saveNewProject(workspaceToXML() ?? '');
        } catch (e) { onErrorMessage("Error saving project", e); return; }
      }
      await goto('/projects');
      return;
    }
    const choice = await requestConfirm("Save changes before leaving?");
    if (choice) {
      try { await saveCurrentProject(workspaceToXML() ?? ''); } catch (e) { onErrorMessage("Error saving project", e); return; }
    }
    await goto('/projects');
  }

  async function handleNewFile() {
    closeDropdown();
    if (!$projectStore.project) { resetWorkspace(); return; }
    const confirmed = await requestConfirm("Save current project and create a new one?");
    if (!confirmed) return;
    try {
      const xml = workspaceToXML() ?? '';
      await saveCurrentProject(xml);
      projectStore.set({ projectId: null, project: null });
      await goto('/projects');
      resetWorkspace();
    } catch (e) { onErrorMessage("Error saving project", e); }
  }

  async function handleSave() {
    closeDropdown();
    saveStatus = 'saving';
    try {
      const xml = workspaceToXML() ?? '';
      if (!$projectStore.projectId) {
        if (!(await saveNewProject(xml))) {
          saveStatus = 'idle';
          return;
        }
      } else {
        await saveCurrentProject(xml);
      }
      saveStatus = 'saved';
    } catch (e) {
      saveStatus = 'error';
      onErrorMessage("Error saving project", e);
    }
  }

  async function handleFork() {
    closeDropdown();
    if (!$projectStore.projectId) return;
    try {
      const result = (await getApiClient().mutation('projects:forkProject', { projectId: $projectStore.projectId })) as { projectId: string };
      await goto(`/studio?projectid=${result.projectId}`);
    } catch (e) { onErrorMessage("Could not fork project", e); }
  }

  function handleNavigate(path: string) {
    closeDropdown();
    goto(path);
  }
</script>

<div class="left-toolbar">
  <div class="toolbar-header">
    <div class="identity-row">
      <img src="/LOGO%20-%20Inversed.svg" alt="Wireloop" class="logo-img" />
      <span class="logo-label">{projectName}</span>
      <button onclick={toggleDropdown} class="menu-btn" title="Project menu" aria-label="Open project menu" aria-expanded={isDropdownOpen}>
        <span class="chevron {isDropdownOpen ? 'open' : ''}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </span>
      </button>
    </div>

    <div class="project-meta" aria-live="polite">
      <span class="project-scope">{projectScope}</span>
      <span class="status-line status-{saveStatus}">
        <span class="status-dot" aria-hidden="true"></span>
        {saveStatus === 'saving'
          ? 'Saving…'
          : saveStatus === 'error'
            ? 'Save failed'
            : $projectStore.projectId
              ? 'Saved'
              : 'Not saved'}
      </span>
    </div>

    {#if isDropdownOpen}
      <div class="dropdown-menu" onmouseleave={closeDropdown} transition:fly={{ y: -8, duration: 120 }} role="menu" tabindex="-1">
        <button class="dropdown-item" onclick={handleExit}>
          <i class="fa fa-folder-open-o"></i>
          <span>Exit to projects</span>
        </button>
        <button class="dropdown-item" onclick={handleNewFile}>
          <i class="fa fa-file-o"></i>
          <span>New File</span>
        </button>
        <button class="dropdown-item" onclick={handleSave}>
          <i class="fa fa-floppy-o"></i>
          <span>Save</span>
        </button>
        <button class="dropdown-item" onclick={handleFork}>
          <i class="fa fa-code-fork"></i>
          <span>Fork</span>
        </button>
        <div class="dropdown-divider"></div>
        <button class="dropdown-item" onclick={() => handleNavigate('/project-settings')}>
          <i class="fa fa-wrench"></i>
          <span>Project Settings</span>
        </button>
      </div>
    {/if}

  </div>

  <div class="toolbar-divider"></div>

  <div id="blockly-toolbox-host" class="toolbox-host"></div>
</div>

<Dialog.Root open={nameDialogOpen} onOpenChange={(open) => { if (!open) finishProjectName(null); }}>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content class="sm:max-w-md">
      <Dialog.Header>
        <Dialog.Title>Name your project</Dialog.Title>
        <Dialog.Description>Give this workspace a name before saving it.</Dialog.Description>
      </Dialog.Header>
      <form onsubmit={(event) => { event.preventDefault(); finishProjectName(projectNameInput); }}>
        <div class="grid gap-2 py-4">
          <Label for="project-name">Project name</Label>
          <Input id="project-name" bind:value={projectNameInput} placeholder="Untitled" autofocus />
        </div>
        <Dialog.Footer>
          <Button type="button" variant="outline" onclick={() => finishProjectName(null)}>Cancel</Button>
          <Button type="submit" disabled={!projectNameInput.trim()}>Save project</Button>
        </Dialog.Footer>
      </form>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<Dialog.Root open={confirmDialogOpen} onOpenChange={(open) => { if (!open) finishConfirm(false); }}>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content class="sm:max-w-md">
      <Dialog.Header>
        <Dialog.Title>Leave project?</Dialog.Title>
        <Dialog.Description>{confirmMessage}</Dialog.Description>
      </Dialog.Header>
      <Dialog.Footer>
        <Button variant="outline" onclick={() => finishConfirm(false)}>Cancel</Button>
        <Button onclick={() => finishConfirm(true)}>Save and continue</Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  .left-toolbar { width: 180px; height: 100vh; background: hsl(var(--bg-surface)); border-right: 1px solid hsl(var(--border)); display: flex; flex-direction: column; align-items: stretch; position: relative; flex-shrink: 0; z-index: 60; }
  .toolbar-header { position: relative; padding: 10px 10px 8px; display: flex; flex-direction: column; align-items: stretch; width: 100%; background: hsl(var(--bg-surface)); }
  .identity-row { display: flex; flex-direction: row; align-items: center; justify-content: flex-start; gap: 9px; min-width: 0; padding: 0 2px; }
  .logo-img { width: 27px; height: auto; filter: brightness(1.1); flex-shrink: 0; }
  .logo-label { flex: 0 1 auto; max-width: 112px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; font-weight: 600; color: hsl(var(--foreground)); text-align: left; letter-spacing: 0.01em; }
  .menu-btn { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; padding: 0; background: none; border: 0; border-radius: 5px; cursor: pointer; color: hsl(var(--muted-foreground)); }
  .menu-btn:hover { background: hsl(var(--foreground) / 0.08); color: hsl(var(--foreground)); }
  .menu-btn:focus-visible { outline: 2px solid hsl(var(--ring)); outline-offset: 2px; }
  .chevron { display: flex; align-items: center; justify-content: center; color: hsl(var(--muted-foreground)); transition: transform 0.2s; flex-shrink: 0; }
  .chevron.open { transform: rotate(180deg); }
  .dropdown-menu { position: absolute; left: 8px; top: 42px; min-width: 200px; background: hsl(var(--popover)); border: 1px solid hsl(var(--border)); border-radius: 8px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3); padding: 6px; z-index: 100; display: flex; flex-direction: column; gap: 2px; }
  .dropdown-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: none; border: none; color: hsl(var(--popover-foreground)); font-size: 13px; cursor: pointer; border-radius: 4px; width: 100%; text-align: left; transition: background 0.1s; }
  .dropdown-item:hover { background: hsl(var(--foreground) / 0.1); }
  .dropdown-item i { width: 18px; text-align: center; font-size: 14px; color: hsl(var(--muted-foreground)); }
  .dropdown-divider { height: 1px; background: hsl(var(--border)); margin: 4px 8px; }
  .project-meta { display: flex; align-self: flex-start; align-items: center; justify-content: flex-start; gap: 6px; width: calc(100% - 4px); min-width: 0; padding: 2px 2px 0; }
  .project-scope { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: hsl(var(--muted-foreground)); font-size: 11px; font-weight: 500; text-align: left; letter-spacing: 0.02em; }
  .status-line { display: inline-flex; align-items: center; gap: 4px; flex: 0 0 auto; padding: 3px 6px; border: 1px solid hsl(var(--border)); border-radius: 999px; color: hsl(var(--muted-foreground)); background: hsl(var(--muted) / 0.35); font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.03em; text-transform: uppercase; }
  .status-dot { width: 6px; height: 6px; border-radius: 999px; background: hsl(var(--muted-foreground)); }
  .status-saved { color: hsl(var(--success)); }
  .status-saved .status-dot { background: hsl(var(--success)); }
  .status-saving { color: hsl(var(--accent)); }
  .status-saving .status-dot { background: hsl(var(--accent)); animation: status-pulse 1s ease-in-out infinite; }
  .status-error { color: hsl(var(--destructive)); }
  .status-error .status-dot { background: hsl(var(--destructive)); }
  .toolbar-divider { width: 100%; height: 1px; background: hsl(var(--border)); margin: 4px 0; padding: 0 8px; box-sizing: border-box; }
  .toolbox-host { flex: 1; width: 100%; padding: 4px 0; overflow-y: auto; overflow-x: hidden; }
  .toolbox-host :global(.blocklyToolboxDiv) { background: hsl(var(--bg-surface)); }
  .toolbox-host::-webkit-scrollbar { width: 3px; }
  .toolbox-host::-webkit-scrollbar-track { background: transparent; }
  .toolbox-host::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 2px; }
  @keyframes status-pulse { 50% { opacity: 0.35; } }

  @media (max-width: 760px) {
    .left-toolbar { width: 100%; height: auto; min-height: 116px; border-right: 0; border-bottom: 1px solid hsl(var(--border)); }
    .toolbar-header { padding: 10px 12px 8px; }
    .identity-row { padding: 0; }
    .logo-label { max-width: min(48vw, 220px); }
    .toolbar-divider { display: none; }
    .toolbox-host { height: 64px; flex: none; padding: 4px 12px; }
  }
</style>
