<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { fade, fly } from 'svelte/transition';
  import { resetWorkspace, workspaceToXML } from '../../core/blockly/helpers/workspace.helper';
  import { createCurrentProject, saveCurrentProject } from '../../stores/project.store';
  import projectStore from '../../stores/project.store';
  import { getApiClient } from '../../stores/api.client';
  import { onErrorMessage } from '../../help/alerts';
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { wait } from '../../helpers/wait';

  let isDropdownOpen = $state(false);
  let showSaveSuccess = $state(false);
  let canSave = $state(true);
  let nameDialogOpen = $state(false);
  let projectName = $state('');
  let resolveProjectName: ((name: string | null) => void) | null = null;
  let confirmDialogOpen = $state(false);
  let confirmMessage = $state('');
  let resolveConfirm: ((confirmed: boolean) => void) | null = null;

  function toggleDropdown() { isDropdownOpen = !isDropdownOpen; }
  function closeDropdown() { isDropdownOpen = false; }

  function requestProjectName(): Promise<string | null> {
    return new Promise((resolve) => {
      resolveProjectName = resolve;
      projectName = '';
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
    if (!canSave) return;
    try {
      const xml = workspaceToXML() ?? '';
      if (!$projectStore.projectId) {
        if (!(await saveNewProject(xml))) return;
      } else {
        await saveCurrentProject(xml);
      }
      showSaveSuccess = true;
      await wait(1500);
      showSaveSuccess = false;
    } catch (e) { onErrorMessage("Error saving project", e); }
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
    <button onclick={toggleDropdown} class="logo-btn" title="Menu">
      <img src="/LOGO%20-%20Inversed.svg" alt="Wireloop" class="logo-img" />
      <span class="logo-label">Wireloop</span>
      <span class="chevron {isDropdownOpen ? 'open' : ''}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </span>
    </button>

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
      <form onsubmit={(event) => { event.preventDefault(); finishProjectName(projectName); }}>
        <div class="grid gap-2 py-4">
          <Label for="project-name">Project name</Label>
          <Input id="project-name" bind:value={projectName} placeholder="Untitled project" autofocus />
        </div>
        <Dialog.Footer>
          <Button type="button" variant="outline" onclick={() => finishProjectName(null)}>Cancel</Button>
          <Button type="submit" disabled={!projectName.trim()}>Save project</Button>
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

{#if showSaveSuccess}
  <p transition:fade class="save-toast">project saved</p>
{/if}

<style>
  .left-toolbar { width: 180px; height: 100vh; background: hsl(var(--background)); border-right: 1px solid hsl(var(--border)); display: flex; flex-direction: column; align-items: stretch; position: relative; flex-shrink: 0; z-index: 60; }
  .toolbar-header { position: relative; padding: 4px 8px; display: flex; flex-direction: column; align-items: stretch; width: 100%; }
  .logo-btn { display: flex; flex-direction: row; align-items: center; gap: 8px; padding: 6px 10px; background: none; border: none; cursor: pointer; color: hsl(var(--primary)); width: 100%; transition: background 0.15s; border-radius: 6px; }
  .logo-btn:hover { background: hsl(var(--accent) / 0.08); }
  .logo-img { width: 24px; height: auto; filter: brightness(1.1); flex-shrink: 0; }
  .logo-label { flex: 1; font-size: 13px; font-weight: 600; color: hsl(var(--foreground)); text-align: left; letter-spacing: 0.01em; }
  .chevron { display: flex; align-items: center; justify-content: center; color: hsl(var(--muted-foreground)); transition: transform 0.2s; flex-shrink: 0; }
  .chevron.open { transform: rotate(180deg); }
  .dropdown-menu { position: absolute; left: 8px; top: 42px; min-width: 200px; background: hsl(var(--popover)); border: 1px solid hsl(var(--border)); border-radius: 8px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3); padding: 6px; z-index: 100; display: flex; flex-direction: column; gap: 2px; }
  .dropdown-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: none; border: none; color: hsl(var(--popover-foreground)); font-size: 13px; cursor: pointer; border-radius: 4px; width: 100%; text-align: left; transition: background 0.1s; }
  .dropdown-item:hover { background: hsl(var(--accent) / 0.1); }
  .dropdown-item i { width: 18px; text-align: center; font-size: 14px; color: hsl(var(--muted-foreground)); }
  .dropdown-divider { height: 1px; background: hsl(var(--border)); margin: 4px 8px; }
  .toolbar-divider { width: 100%; height: 1px; background: hsl(var(--border)); margin: 4px 0; padding: 0 8px; box-sizing: border-box; }
  .toolbox-host { flex: 1; width: 100%; padding: 4px 0; overflow-y: auto; overflow-x: hidden; }
  .toolbox-host::-webkit-scrollbar { width: 3px; }
  .toolbox-host::-webkit-scrollbar-track { background: transparent; }
  .toolbox-host::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 2px; }
  .save-toast { position: fixed; left: 50%; top: 24px; transform: translateX(-50%); background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); padding: 8px 20px; border-radius: 6px; font-size: 13px; font-weight: 500; z-index: 200; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2); }
</style>
