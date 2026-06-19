<script lang="ts">
  const navTooltipStyle = {
    position: "bottom",
    align: "center",
    animation: "slide",
    theme: "nav-tooltip",
  };
  import authStore from "../../stores/auth.store";
  import projectStore from "../../stores/project.store";
  import { isPathOnHomePage } from "../../helpers/is-path-on-homepage";
  import { fade } from "svelte/transition";
  // TODO: CLERK_REMOVAL — do not delete yet.
  // import { logout } from "../../auth/clerk-auth";
  const logout = async () => {};
  import { resetWorkspace, workspaceToXML } from "../../core/blockly/helpers/workspace.helper";
  import { saveCurrentProject } from "../../stores/project.store";
  import { wait } from "../../helpers/wait";
  import { onConfirm, onErrorMessage } from "../../help/alerts";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { tooltip } from "@svelte-plugins/tooltips";

  let canSave = true;
  let showSaveSuccess = false;
  let params = "";

  projectStore.subscribe((p) => {
    if (p.projectId) {
      params = `?projectid=${p.projectId}`;
    } else {
      params = "";
    }
  });

  async function onNewFileAuth() {
    if (!$projectStore.project) {
      onNewFileNoAuth();
      return;
    }

    const confirmNewFile = await onConfirm(
      "We are about to save your current project and create a new one? Would you like to continue?"
    );

    if (!confirmNewFile) {
      return;
    }
    try {
      const workspaceXml = workspaceToXML() ?? '';
      await saveCurrentProject(workspaceXml);
      projectStore.set({ projectId: null, project: null });
      await goto("/");
      resetWorkspace();
    } catch (e: unknown) {
      onErrorMessage("Error saving your project please try agian.", e);
    }
  }

  async function onNewFileNoAuth() {
    const confirmNewFile = await onConfirm(
      "You are creating a new file, which will delete your work.  Would you like to continue?"
    );
    if (!confirmNewFile) {
      return;
    }

    resetWorkspace();
  }

  async function onSaveClick() {
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
      onErrorMessage("Error saving your project please try agian.", e);
    }
  }

  async function onSignOut() {
    try {
      // TODO: CLERK_REMOVAL — do not delete yet.
      // await logout();
      console.log('Clerk logout commented out');
    } catch (e: unknown) {
      onErrorMessage("Please try again in 5 minutes", e);
    }
  }
</script>

<nav class="w-full h-14 bg-bg-surface border-b border-border shadow-card flex items-center px-4 relative z-50" class:justify-between={!$authStore.isLoggedIn}>
  <div class="flex items-center">
    <a href="/" class="flex items-center mr-8 no-underline">
      <span class="font-mono font-bold text-2xl text-primary tracking-tighter shadow-glow-blue px-2 border border-primary/20 rounded-sm">AWB</span>
    </a>
    
    <div class="flex items-center space-x-1">
      {#if $authStore.isLoggedIn}
        <a
          title="Home"
          use:tooltip={navTooltipStyle}
          href="/{params}"
          class="p-2 text-primary/60 hover:text-primary transition-colors flex items-center justify-center rounded-sm {isPathOnHomePage($page.url.pathname ?? '') ? 'text-primary bg-primary/10' : ''}"
        >
          <i class="fa fa-home text-2xl"></i>
        </a>

        <a
          href="/code{params}"
          title="Code"
          use:tooltip={navTooltipStyle}
          class="p-2 transition-colors flex items-center justify-center rounded-sm {$page.url.pathname.includes('code') ? 'text-primary bg-primary/10' : 'text-primary/60 hover:text-primary'}"
        >
          <i class="fa fa-code text-2xl"></i>
        </a>
        <a
          href="/arduino{params}"
          use:tooltip={navTooltipStyle}
          title="Upload"
          class="p-2 transition-colors flex items-center justify-center rounded-sm {$page.url.pathname.includes('arduino') ? 'text-primary bg-primary/10' : 'text-primary/60 hover:text-primary'}"
        >
          <i class="fa fa-microchip text-2xl"></i>
        </a>

        <a
          href="/open"
          use:tooltip={navTooltipStyle}
          title="My Projects"
          class="p-2 text-primary/60 hover:text-primary transition-colors flex items-center justify-center rounded-sm {$page.url.pathname.includes('open') ? 'text-primary bg-primary/10' : ''}"
        >
          <i
            class="fa text-2xl"
            class:fa-folder-open-o={!$page.url.pathname.includes('open')}
            class:fa-folder-open={$page.url.pathname.includes('open')}
          ></i>
        </a>
        <span
          title="New File/Blank File"
          use:tooltip={navTooltipStyle}
          on:click={onNewFileAuth}
          on:keydown={(e) => e.key === 'Enter' && onNewFileAuth()}
          role="button"
          tabindex="0"
          class="p-2 text-primary/60 hover:text-primary transition-colors cursor-pointer flex items-center justify-center rounded-sm"
        >
          <i class="fa fa-file-o text-2xl"></i>
        </span>
        <span
          title="Save Project"
          use:tooltip={navTooltipStyle}
          on:click={onSaveClick}
          on:keydown={(e) => e.key === 'Enter' && onSaveClick()}
          role="button"
          tabindex="0"
          class="p-2 text-primary/60 hover:text-primary transition-colors cursor-pointer flex items-center justify-center rounded-sm"
        >
          <i class="fa fa-floppy-o text-2xl"></i>
        </span>
        <a
          title="Project Settings"
          href="/project-settings"
          use:tooltip={navTooltipStyle}
          class="p-2 text-primary/60 hover:text-primary transition-colors flex items-center justify-center rounded-sm {$page.url.pathname.includes("project-settings") ? 'text-primary bg-primary/10' : ''}"
        >
          <i class="fa fa-wrench text-2xl" aria-hidden="true"></i>
        </a>
        <a
          title="Settings"
          use:tooltip={navTooltipStyle}
          href="/settings"
          class="p-2 transition-colors flex items-center justify-center rounded-sm {$page.url.pathname.includes('settings') ? 'text-primary bg-primary/10' : 'text-primary/60 hover:text-primary'}"
        >
          <i class="fa fa-gears text-2xl"></i>
        </a>
      {/if}

      {#if !$authStore.isLoggedIn}
        <a
          href="/"
          title="Home"
          use:tooltip={navTooltipStyle}
          class="p-2 text-primary/60 hover:text-primary transition-colors flex items-center justify-center rounded-sm {isPathOnHomePage($page.url.pathname ?? '') ? 'text-primary bg-primary/10' : ''}"
        >
          <i class="fa fa-home text-2xl"></i>
        </a>

        <a
          href="/code"
          title="Code"
          use:tooltip={navTooltipStyle}
          class="p-2 transition-colors flex items-center justify-center rounded-sm {$page.url.pathname.includes('code') ? 'text-primary bg-primary/10' : 'text-primary/60 hover:text-primary'}"
        >
          <i class="fa fa-code text-2xl"></i>
        </a>
        <a
          href="/arduino"
          use:tooltip={navTooltipStyle}
          title="Upload"
          class="p-2 transition-colors flex items-center justify-center rounded-sm {$page.url.pathname.includes('arduino') ? 'text-primary bg-primary/10' : 'text-primary/60 hover:text-primary'}"
        >
          <i class="fa fa-microchip text-2xl"></i>
        </a>

        <a
          href="/open"
          use:tooltip={navTooltipStyle}
          title="Projects"
          class="p-2 text-primary/60 hover:text-primary transition-colors flex items-center justify-center rounded-sm {$page.url.pathname.includes("open") ? 'text-primary bg-primary/10' : ''}"
        >
          <i
            class="fa text-2xl"
            class:fa-folder-open-o={!$page.url.pathname.includes("open")}
            class:fa-folder-open={$page.url.pathname.includes("open")}
          ></i>
        </a>
        <span
          use:tooltip={navTooltipStyle}
          title="New File/Blank File"
          on:click={onNewFileNoAuth}
          on:keydown={(e) => e.key === 'Enter' && onNewFileNoAuth()}
          role="button"
          tabindex="0"
          class="p-2 text-primary transition-colors cursor-pointer flex items-center justify-center rounded-sm bg-primary/10"
        >
          <i class="fa fa-file-o text-2xl"></i>
        </span>
        <a
          href="/download"
          use:tooltip={navTooltipStyle}
          title="Download"
          class="p-2 text-primary/60 hover:text-primary transition-colors flex items-center justify-center rounded-sm {$page.url.pathname.includes("download") ? 'text-primary bg-primary/10' : ''}"
        >
          <i class="fa fa-download text-2xl"></i>
        </a>
        <a
          href="/settings"
          use:tooltip={navTooltipStyle}
          title="Settings"
          class="p-2 text-primary/60 hover:text-primary transition-colors flex items-center justify-center rounded-sm {$page.url.pathname.includes("settings") ? 'text-primary bg-primary/10' : ''}"
        >
          <i class="fa fa-gears text-2xl"></i>
        </a>
      {/if}
    </div>
  </div>

  <div class="flex items-center space-x-1">
    {#if $authStore.isLoggedIn}
      <span 
        use:tooltip={navTooltipStyle} 
        on:click={onSignOut} 
        on:keydown={(e) => e.key === 'Enter' && onSignOut()}
        title="Sign Out"
        role="button"
        tabindex="0"
        class="p-2 text-danger hover:bg-danger/10 transition-colors cursor-pointer flex items-center justify-center rounded-sm"
      >
        <i class="fa fa-sign-out text-2xl" title="Sign Out" aria-hidden="true"></i>
      </span>
    {:else}
      <a
        href="/login"
        use:tooltip={navTooltipStyle}
        title="Login"
        class="p-2 text-primary/60 hover:text-primary transition-colors flex items-center justify-center rounded-sm {$page.url.pathname.includes("login") ? 'text-primary bg-primary/10' : ''}"
      >
        <i class="fa fa-sign-in text-2xl"></i>
      </a>
    {/if}
    
    <a
      title="About"
      use:tooltip={navTooltipStyle}
      href="/about"
      class="p-2 text-primary/60 hover:text-primary transition-colors flex items-center justify-center rounded-sm {$page.url.pathname.includes("about") ? 'text-primary bg-primary/10' : ''}"
    >
      <i class="fa fa-info-circle text-2xl"></i>
    </a>
  </div>
</nav>

{#if showSaveSuccess}
  <p transition:fade id="saved" class="data-readout absolute left-1/2 top-24 -translate-x-1/2 z-[100] shadow-glow-blue border-primary">
    project saved
  </p>
{/if}

<style>
  :global(.tooltip.nav-tooltip) {
    margin-top: 8px;
    background-color: #1A2236 !important;
    border: 1px solid #1E3A5F !important;
    color: #00BFFF !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.75rem !important;
    border-radius: 2px !important;
  }
</style>
