<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { fade, fly } from 'svelte/transition';
  import { resetWorkspace, workspaceToXML } from '../../core/blockly/helpers/workspace.helper';
  import { saveCurrentProject } from '../../stores/project.store';
  import projectStore from '../../stores/project.store';
  import authStore from '../../stores/auth.store';
  import { onConfirm, onErrorMessage } from '../../help/alerts';
  import { wait } from '../../helpers/wait';
  import { tooltip } from '$lib/tooltip';
  
  let isDropdownOpen = $state(false);
  let showSaveSuccess = $state(false);
  let canSave = $state(true);

  const tooltipStyle = {
    position: "bottom",
    align: "center",
    animation: "slide",
    theme: "nav-tooltip",
  };

  function toggleDropdown() {
    isDropdownOpen = !isDropdownOpen;
  }

  function closeDropdown() {
    isDropdownOpen = false;
  }

  async function handleNewFile() {
    closeDropdown();
    if (!$projectStore.project) {
      resetWorkspace();
      return;
    }
    const confirmed = await onConfirm(
      "We are about to save your current project and create a new one? Would you like to continue?"
    );
    if (!confirmed) return;
    try {
      const workspaceXml = workspaceToXML() ?? '';
      await saveCurrentProject(workspaceXml);
      projectStore.set({ projectId: null, project: null });
      await goto("/");
      resetWorkspace();
    } catch (e: unknown) {
      onErrorMessage("Error saving your project please try again.", e);
    }
  }

  async function handleSave() {
    closeDropdown();
    if (!$projectStore.projectId) {
      await goto("/project-settings");
      return;
    }
    if (!canSave) return;
    try {
      const workspaceXml = workspaceToXML() ?? '';
      await saveCurrentProject(workspaceXml);
      showSaveSuccess = true;
      await wait(1500);
      canSave = true;
      showSaveSuccess = false;
    } catch (e: unknown) {
      onErrorMessage("Error saving your project please try again.", e);
    }
  }

  function handleNavigate(path: string) {
    closeDropdown();
    goto(path);
  }
</script>

<div class="left-toolbar">
  <!-- Logo + Dropdown Trigger -->
  <div class="toolbar-header">
    <button
      onclick={toggleDropdown}
      class="logo-btn"
      title="Menu"
    >
      <img src="/LOGO%20-%20Inversed.svg" alt="Wireloop" class="logo-img" />
      <span class="logo-label">Wireloop</span>
      <span class="chevron {isDropdownOpen ? 'open' : ''}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </span>
    </button>

    <!-- Dropdown Menu -->
    {#if isDropdownOpen}
      <div class="dropdown-menu" onmouseleave={closeDropdown} transition:fly={{ y: -8, duration: 120 }}>
        <button class="dropdown-item" onclick={() => handleNavigate('/open')}>
          <i class="fa fa-folder-open-o"></i>
          <span>My Projects</span>
        </button>
        <button class="dropdown-item" onclick={handleNewFile}>
          <i class="fa fa-file-o"></i>
          <span>New File</span>
        </button>
        <button class="dropdown-item" onclick={handleSave}>
          <i class="fa fa-floppy-o"></i>
          <span>Save</span>
        </button>
        <div class="dropdown-divider"></div>
        <button class="dropdown-item" onclick={() => handleNavigate('/project-settings')}>
          <i class="fa fa-wrench"></i>
          <span>Project Settings</span>
        </button>
        <button class="dropdown-item" onclick={() => handleNavigate('/settings')}>
          <i class="fa fa-gears"></i>
          <span>Settings</span>
        </button>
        <button class="dropdown-item" onclick={() => handleNavigate('/about')}>
          <i class="fa fa-info-circle"></i>
          <span>About</span>
        </button>
        {#if $authStore.isLoggedIn}
          <div class="dropdown-divider"></div>
          <button class="dropdown-item logout" onclick={() => handleNavigate('/login')}>
            <i class="fa fa-sign-out"></i>
            <span>Sign Out</span>
          </button>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Divider -->
  <div class="toolbar-divider"></div>

  <!-- Blockly Toolbox Mount Point -->
  <div id="blockly-toolbox-host" class="toolbox-host">
    <!-- Blockly will render its toolbox into this area -->
  </div>
</div>

{#if showSaveSuccess}
  <p transition:fade class="save-toast">project saved</p>
{/if}

<style>
  .left-toolbar {
    width: 180px;
    height: 100vh;
    background: hsl(var(--background));
    border-right: 1px solid hsl(var(--border));
    display: flex;
    flex-direction: column;
    align-items: stretch;
    position: relative;
    flex-shrink: 0;
    z-index: 60;
  }

  .toolbar-header {
    position: relative;
    padding: 4px 8px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }

  .logo-btn {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: none;
    border: none;
    cursor: pointer;
    color: hsl(var(--primary));
    width: 100%;
    transition: background 0.15s;
    border-radius: 6px;
  }

  .logo-btn:hover {
    background: hsl(var(--accent) / 0.08);
  }

  .logo-img {
    width: 24px;
    height: auto;
    filter: brightness(1.1);
    flex-shrink: 0;
  }

  .logo-label {
    flex: 1;
    font-size: 13px;
    font-weight: 600;
    color: hsl(var(--foreground));
    text-align: left;
    letter-spacing: 0.01em;
  }

  .chevron {
    display: flex;
    align-items: center;
    justify-content: center;
    color: hsl(var(--muted-foreground));
    transition: transform 0.2s;
    flex-shrink: 0;
  }

  .chevron.open {
    transform: rotate(180deg);
  }

  .dropdown-menu {
    position: absolute;
    left: 8px;
    top: 42px;
    min-width: 200px;
    background: hsl(var(--popover));
    border: 1px solid hsl(var(--border));
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    padding: 6px;
    z-index: 100;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: none;
    border: none;
    color: hsl(var(--popover-foreground));
    font-size: 13px;
    cursor: pointer;
    border-radius: 4px;
    width: 100%;
    text-align: left;
    transition: background 0.1s;
  }

  .dropdown-item:hover {
    background: hsl(var(--accent) / 0.1);
  }

  .dropdown-item i {
    width: 18px;
    text-align: center;
    font-size: 14px;
    color: hsl(var(--muted-foreground));
  }

  .dropdown-item.logout i {
    color: hsl(var(--destructive));
  }

  .dropdown-item.logout:hover {
    background: hsl(var(--destructive) / 0.1);
  }

  .dropdown-divider {
    height: 1px;
    background: hsl(var(--border));
    margin: 4px 8px;
  }

  .toolbar-divider {
    width: 100%;
    height: 1px;
    background: hsl(var(--border));
    margin: 4px 0;
    padding: 0 8px;
    box-sizing: border-box;
  }

  .toolbox-host {
    flex: 1;
    width: 100%;
    padding: 4px 0;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .toolbox-host::-webkit-scrollbar {
    width: 3px;
  }
  .toolbox-host::-webkit-scrollbar-track {
    background: transparent;
  }
  .toolbox-host::-webkit-scrollbar-thumb {
    background: hsl(var(--border));
    border-radius: 2px;
  }

  .save-toast {
    position: fixed;
    left: 50%;
    top: 24px;
    transform: translateX(-50%);
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    padding: 8px 20px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    z-index: 200;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  }
</style>
