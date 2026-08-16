<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { fly } from 'svelte/transition';
  import { resetWorkspace, workspaceToXML } from '../../core/blockly/helpers/workspace.helper';
  import { createCurrentProject, saveCurrentProject } from '../../stores/project.store';
  import projectStore from '../../stores/project.store';
  import { getApiClient } from '../../stores/api.client';
  import { onErrorMessage } from '../../help/alerts';
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';

  let isDropdownOpen = $state(false);
  let saveStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
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

    <div class="project-status" aria-live="polite">
      <span class="project-name">{$projectStore.project?.name ?? 'Untitled project'}</span>
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
    <button class="save-button" onclick={handleSave} disabled={saveStatus === 'saving'}>
      <i class="fa fa-floppy-o" aria-hidden="true"></i>
      <span>{saveStatus === 'saving' ? 'Saving…' : 'Save'}</span>
    </button>
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

<style>
  .left-toolbar { width: 180px; height: 100vh; background: hsl(var(--background)); border-right: 1px solid hsl(var(--border)); display: flex; flex-direction: column; align-items: stretch; position: relative; flex-shrink: 0; z-index: 60; }
  .toolbar-header { position: relative; padding: 4px 8px; display: flex; flex-direction: column; align-items: stretch; width: 100%; }
  .logo-btn { display: flex; flex-direction: row; align-items: center; gap: 8px; padding: 6px 10px; background: none; border: none; cursor: pointer; color: hsl(var(--primary)); width: 100%; transition: background 0.15s; border-radius: 6px; }
  .logo-btn:hover { background: hsl(var(--accent) / 0.08); }
  .logo-btn:focus-visible, .save-button:focus-visible { outline: 2px solid hsl(var(--ring)); outline-offset: 2px; }
  .logo-img { width: 24px; height: auto; filter: brightness(1.1); flex-shrink: 0; }
  .logo-label { flex: 1; font-size: 13px; font-weight: 600; color: hsl(var(--foreground)); text-align: left; letter-spacing: 0.01em; }
  .chevron { display: flex; align-items: center; justify-content: center; color: hsl(var(--muted-foreground)); transition: transform 0.2s; flex-shrink: 0; }
  .chevron.open { transform: rotate(180deg); }
  .dropdown-menu { position: absolute; left: 8px; top: 42px; min-width: 200px; background: hsl(var(--popover)); border: 1px solid hsl(var(--border)); border-radius: 8px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3); padding: 6px; z-index: 100; display: flex; flex-direction: column; gap: 2px; }
  .dropdown-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: none; border: none; color: hsl(var(--popover-foreground)); font-size: 13px; cursor: pointer; border-radius: 4px; width: 100%; text-align: left; transition: background 0.1s; }
  .dropdown-item:hover { background: hsl(var(--accent) / 0.1); }
  .dropdown-item i { width: 18px; text-align: center; font-size: 14px; color: hsl(var(--muted-foreground)); }
  .dropdown-divider { height: 1px; background: hsl(var(--border)); margin: 4px 8px; }
  .project-status { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px 6px; border-top: 1px solid hsl(var(--border)); margin-top: 4px; }
  .project-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: hsl(var(--foreground)); font-size: 12px; font-weight: 600; }
  .status-line { display: inline-flex; align-items: center; gap: 6px; color: hsl(var(--muted-foreground)); font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.04em; text-transform: uppercase; }
  .status-dot { width: 6px; height: 6px; border-radius: 999px; background: hsl(var(--muted-foreground)); }
  .status-saved { color: hsl(var(--success)); }
  .status-saved .status-dot { background: hsl(var(--success)); }
  .status-saving { color: hsl(var(--accent)); }
  .status-saving .status-dot { background: hsl(var(--accent)); animation: status-pulse 1s ease-in-out infinite; }
  .status-error { color: hsl(var(--destructive)); }
  .status-error .status-dot { background: hsl(var(--destructive)); }
  .save-button { display: flex; align-items: center; justify-content: center; gap: 7px; margin: 2px 8px 6px; padding: 7px 10px; border: 1px solid hsl(var(--border-strong)); border-radius: 6px; background: hsl(var(--foreground)); color: hsl(var(--background)); cursor: pointer; font-size: 12px; font-weight: 600; transition: opacity 150ms, transform 150ms; }
  .save-button:hover:not(:disabled) { opacity: 0.88; }
  .save-button:active:not(:disabled) { transform: scale(0.98); }
  .save-button:disabled { cursor: wait; opacity: 0.55; }
  .toolbar-divider { width: 100%; height: 1px; background: hsl(var(--border)); margin: 4px 0; padding: 0 8px; box-sizing: border-box; }
  .toolbox-host { flex: 1; width: 100%; padding: 4px 0; overflow-y: auto; overflow-x: hidden; }
  .toolbox-host::-webkit-scrollbar { width: 3px; }
  .toolbox-host::-webkit-scrollbar-track { background: transparent; }
  .toolbox-host::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 2px; }
  @keyframes status-pulse { 50% { opacity: 0.35; } }

  @media (max-width: 760px) {
    .left-toolbar { width: 100%; height: auto; min-height: 116px; border-right: 0; border-bottom: 1px solid hsl(var(--border)); }
    .toolbar-header { flex-direction: row; align-items: center; padding: 8px 12px; gap: 8px; }
    .logo-btn { width: auto; padding: 8px; }
    .logo-label { display: none; }
    .project-status { flex: 1; border-top: 0; border-left: 1px solid hsl(var(--border)); margin-top: 0; padding: 4px 12px; min-width: 0; }
    .save-button { margin: 0; padding: 8px 12px; width: auto; }
    .toolbar-divider { display: none; }
    .toolbox-host { height: 64px; flex: none; padding: 4px 12px; }
  }
</style>
