<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Snippet } from 'svelte';
  let { children }: { children: Snippet } = $props();
  import debounce from 'lodash/debounce';
  import LeftToolbar from '../../components/wireloop/LeftToolbar.svelte';
  import RightPanelTabs from '../../components/wireloop/RightPanelTabs.svelte';
  import Blockly from '../../components/wireloop/Blockly.svelte';
  import { resizeStore } from '../../stores/resize.store';
  import { page } from '$app/stores';
  const initAuth = () => { authStore.init(); };

  import { initializeApiClient, getApiClient } from '../../stores/api.client';
  import { mark, fail } from '$lib/telemetry/boot';
  import authStore from '../../stores/auth.store';
  import projectStore from '../../stores/project.store';
  import { onErrorMessage } from '../../help/alerts';
  import type { Project } from '../../types/models';
  import { loadProject } from '../../core/blockly/helpers/workspace.helper';
  let height = $state('500px');
  let middleFlex = $state(59.5);
  let rightFlex = $state(39.5);
  let loadingProject = $state(false);
  let isResizingRight = false;
  let unsubAuth: (() => void) | undefined;
  let unsubPage: (() => void) | undefined;


  function startResize() {
    isResizingRight = true;
  }

  function stopResize() {
    isResizingRight = false;
  }

  const resize = debounce((e: MouseEvent) => {
    if (!isResizingRight) return;
    if (typeof window === 'undefined') return;
    const windowWidth = window.innerWidth;
    if (e.clientX < 20 || windowWidth - e.clientX < 20) return;

    rightFlex = ((windowWidth - e.clientX) / windowWidth) * 100;
    middleFlex = 100 - rightFlex - 1;
    resizeStore.mainWindow();
  }, 2);

  function resizeHeight() {
    if (typeof window === 'undefined') return;
    height = window.innerHeight + 'px';
    setTimeout(() => {
      resizeStore.mainWindow();
    }, 5);
  }

  onMount(async () => {
    mark('studio:layout-mount');
    initAuth();
    initializeApiClient();
    mark('studio:services-init');

    unsubPage = page.subscribe(() => { resizeHeight(); });

    let loadedProject = false;

    const projectIdFromUrl = $page.url.searchParams.get('projectid');

    // A URL project is authoritative. The Blockly destroy hook stores the
    // previous workspace locally, but that must not override the requested DB project.
    if (!projectIdFromUrl && $page.url.searchParams.get('example_project') !== null) {
        const localFileResponse = await fetch(`/example-projects/${$page.url.searchParams.get('example_project')}`);
        const xmlFile = await localFileResponse.text();
        loadProject(xmlFile);
        loadedProject = true;
    } else if (!projectIdFromUrl && localStorage.getItem('reload_once_workspace')) {
      const xmlText = localStorage.getItem('reload_once_workspace');
      localStorage.removeItem('reload_once_workspace');
      if (xmlText) loadProject(xmlText);
      loadedProject = true;
    }

    let loadingProjectId: string | null = null;

    unsubAuth = authStore.subscribe(async (auth) => {
      if (auth.loading) return;
      mark('studio:auth-state', { isLoggedIn: auth.isLoggedIn, uid: !!auth.uid });

      if (!auth.isLoggedIn || !auth.uid) {
        return;
      }

      const projectId = $page.url.searchParams.get('projectid');
      // No projectid means a new unsaved project. Keep the workspace open until
      // the first save gives it a name and persists it.
      if (!projectId && !loadedProject) {
        projectStore.set({ project: null, projectId: null });
        loadedProject = true;
        return;
      }
      if (!projectId) return;
      // ponytail: skip if already loaded OR already loading this projectid
      // (auth subscription can fire multiple times during startup).
      if ($projectStore.projectId === projectId || loadingProjectId === projectId) {
        return;
      }

      loadingProjectId = projectId;
      loadingProject = true;

      try {
        const projectId = $page.url.searchParams.get('projectid');
        const client = getApiClient();
        const project = (await client.query('projects:getProject', { projectId })) as Project | null;
        const projectFile = (await client.query('projects:getProjectFile', {
          projectId,
          userId: auth.uid
        })) as { content?: string; workspace?: string } | null;
        
        if (project && projectFile) {
          mark('studio:project-loaded', { projectId });
           loadProject(projectFile.content || projectFile.workspace || project.workspace || '<xml></xml>');
          projectStore.set({ project, projectId });
        } else {
          throw new Error('Project not found or access denied');
        }
      } catch (error) {
        fail('studio:project-load', error);
        console.error('Error loading project:', error);
        onErrorMessage('Failed to load project. Please try again.');
      } finally {
        loadingProject = false;
        loadingProjectId = null;
      }
    });
  });

  onDestroy(() => {
    unsubAuth?.();
    unsubPage?.();
  });
</script>

<svelte:body onmouseup={stopResize} />
<main
  style="height: {height}"
  onmousemove={resize}
  class="bg-background text-foreground w-full flex box-border overflow-hidden studio-shell"
>
  <LeftToolbar />
  
  <div style="flex: {middleFlex}" id="middle_panel" class="relative overflow-hidden border-r border-border studio-canvas">
    <!-- ponytail: studio layout only renders under /studio, where the old
         isPathOnHomePage distinction is always false → loop block shows the
         "loop forever" mode (the (studio) group-layout design intent). -->
    <Blockly showLoopExecutionTimesArduinoStartBlock={false} />
  </div>
  
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div 
    onmousedown={startResize} 
    class="w-1.5 cursor-col-resize bg-border hover:bg-primary/50 transition-colors flex items-center justify-center relative z-10"
    role="separator"
    aria-label="Resize panels"
  >
    <div class="h-8 w-[1px] bg-primary/30"></div>
  </div>

  <div
    style="flex: {rightFlex}"
    class="bg-card overflow-hidden relative studio-inspector"
    class:opacity-0={rightFlex < 5}
    class:pointer-events-none={rightFlex < 5}
    id="right_panel"
  >
    <RightPanelTabs />
  </div>
</main>

{#if loadingProject}
  <div class="studio-loading-overlay" role="status" aria-label="Loading project">
    <div class="studio-loading-spinner"></div>
    <span class="studio-loading-text">Loading your project…</span>
  </div>
{/if}

{@render children()}

<svelte:window on:resize={resizeHeight} />

<style>
  #right_panel::-webkit-scrollbar {
    width: 6px;
  }
  #right_panel::-webkit-scrollbar-track {
    background: hsl(var(--background));
  }
  #right_panel::-webkit-scrollbar-thumb {
    background: hsl(var(--border));
    border-radius: var(--radius);
  }
  #right_panel::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--muted-foreground));
  }

  .studio-loading-overlay {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    background: hsl(var(--background) / 0.7);
    backdrop-filter: blur(2px);
  }

  .studio-loading-spinner {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 9999px;
    border: 3px solid hsl(var(--border));
    border-top-color: hsl(var(--primary));
    animation: studio-spin 0.7s linear infinite;
  }

  .studio-loading-text {
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
  }

  @keyframes studio-spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 760px) {
    .studio-shell {
      flex-direction: column;
      overflow-y: auto;
    }

    .studio-canvas,
    .studio-inspector {
      flex: none !important;
      width: 100%;
      min-width: 0;
    }

    .studio-canvas {
      height: 62vh;
      min-height: 420px;
      border-right: 0;
      border-bottom: 1px solid hsl(var(--border));
    }

    .studio-inspector {
      height: 64vh;
      min-height: 420px;
    }

    .studio-shell > [role="separator"] {
      display: none;
    }
  }

</style>
