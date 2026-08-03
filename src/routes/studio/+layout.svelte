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
  import { loadProject } from '../../core/blockly/helpers/workspace.helper';
  let height = $state('500px');
  let middleFlex = $state(59.5);
  let rightFlex = $state(39.5);
  let isResizingRight = false;
  let unsubAuth: (() => void) | undefined;

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

    page.subscribe(() => { resizeHeight(); });

    let loadedProject = false;

    if ($page.url.searchParams.get('example_project') !== null) {
        const localFileResponse = await fetch(`/example-projects/${$page.url.searchParams.get('example_project')}`);
        const xmlFile = await localFileResponse.text();
        loadProject(xmlFile);
        loadedProject = true;
    } else if (localStorage.getItem('reload_once_workspace')) {
      const xmlText = localStorage.getItem('reload_once_workspace');
      localStorage.removeItem('reload_once_workspace');
      if (xmlText) loadProject(xmlText);
      loadedProject = true;
    }

    unsubAuth = authStore.subscribe(async (auth) => {
      if (auth.loading) return;
      mark('studio:auth-state', { isLoggedIn: auth.isLoggedIn, uid: !!auth.uid });

      if (!auth.isLoggedIn || !auth.uid) {
        return;
      }

      if (
        $projectStore.projectId === $page.url.searchParams.get('projectid') ||
        !$page.url.searchParams.get('projectid') ||
        loadedProject
      ) {
        return;
      }

      const swal = (await import('sweetalert')).default;
      swal({
        title: 'Loading your project',
        allowEscapeKey: false,
        allowOutsideClick: false,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        onOpen: () => { (swal as any).showLoading(); },
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      try {
        const projectId = $page.url.searchParams.get('projectid');
        const client = getApiClient();
        const project = await client.query('projects:getProject', { projectId });
        const projectFile = await client.query('projects:getProjectFile', { 
          projectId, 
          userId: auth.uid
        });
        
        if (project && projectFile) {
          mark('studio:project-loaded', { projectId });
          loadProject(projectFile.content || projectFile.workspace || '<xml></xml>');
          projectStore.set({ project, projectId });
        } else {
          throw new Error('Project not found or access denied');
        }
      } catch (error) {
        fail('studio:project-load', error);
        console.error('Error loading project:', error);
        swal({
          title: 'Error',
          text: 'Failed to load project. Please try again.',
          icon: 'error'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      } finally {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        (swal as any).close?.();
      }
    });
  });

  onDestroy(() => {
    unsubAuth?.();
  });
</script>

<svelte:body onmouseup={stopResize} />
<main
  style="height: {height}"
  onmousemove={resize}
  class="bg-bg text-text w-full flex box-border overflow-hidden"
>
  <LeftToolbar />
  
  <div style="flex: {middleFlex}" id="middle_panel" class="relative overflow-hidden border-r border-border">
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
    class="bg-bg-surface overflow-hidden relative"
    class:opacity-0={rightFlex < 5}
    class:pointer-events-none={rightFlex < 5}
    id="right_panel"
  >
    <RightPanelTabs />
  </div>
</main>

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
</style>
