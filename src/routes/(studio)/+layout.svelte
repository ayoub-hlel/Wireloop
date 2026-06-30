<script lang="ts">
  import { onMount } from 'svelte';
  import debounce from 'lodash/debounce';
  import { isPathOnHomePage } from '../../helpers/is-path-on-homepage';
  import LeftToolbar from '../../components/wireloop/LeftToolbar.svelte';
  import RightPanelTabs from '../../components/wireloop/RightPanelTabs.svelte';
  import Blockly from '../../components/wireloop/Blockly.svelte';
  import { resizeStore } from '../../stores/resize.store';
  import { page } from '$app/stores';
  const initAuth = () => { authStore.init(); };

  import { initializeConvexClient } from '../../stores/convex.store';
  import authStore from '../../stores/auth.store';
  import projectStore from '../../stores/project.store';
  import { getConvexClient } from '../../stores/convex.store';
  import { loadProject } from '../../core/blockly/helpers/workspace.helper';
  import {
    arduinoLoopBlockShowLoopForeverText,
    arduinoLoopBlockShowNumberOfTimesThroughLoop,
  } from '../../core/blockly/helpers/arduino_loop_block.helper';
  import swal from 'sweetalert';


  let showLoopExecutionTimesArduinoStartBlock = $derived(isPathOnHomePage($page.url.pathname));
  let height = $state('500px');
  let middleFlex = $state(59.5);
  let rightFlex = $state(39.5);
  let isResizingRight = false;

  function startResize() {
    isResizingRight = true;
  }

  function stopResize() {
    isResizingRight = false;
  }

  const resize = debounce((e: MouseEvent) => {
    if (!isResizingRight) return;
    const windowWidth = window.innerWidth;
    if (e.clientX < 20 || windowWidth - e.clientX < 20) return;

    rightFlex = ((windowWidth - e.clientX) / windowWidth) * 100;
    middleFlex = 100 - rightFlex - 1;
    resizeStore.mainWindow();
  }, 2);

  function resizeHeight() {
    height = window.innerHeight + 'px';
    setTimeout(() => {
      resizeStore.mainWindow();
    }, 5);
  }

  onMount(async () => {
    console.log('🚀 Wireloop: Initializing application services...');
    initAuth();
    initializeConvexClient();
    localStorage.removeItem('no_alert');
    
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

    const unsub = authStore.subscribe(async (auth) => {
      if (auth.loading) return;

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

      swal({
        title: 'Loading your project',
        allowEscapeKey: false,
        allowOutsideClick: false,
        onOpen: () => { (swal as any).showLoading(); },
      } as any);

      try {
        const projectId = $page.url.searchParams.get('projectid');
        const convexClient = getConvexClient();
        const project = await convexClient.query('projects:getProject', { projectId });
        const projectFile = await convexClient.query('projects:getProjectFile', { 
          projectId, 
          userId: auth.uid
        });
        
        if (project && projectFile) {
          loadProject(projectFile.content || projectFile.workspace || '<xml></xml>');
          projectStore.set({ project, projectId });
        } else {
          throw new Error('Project not found or access denied');
        }
      } catch (error) {
        console.error('Error loading project:', error);
        swal({
          title: 'Error',
          text: 'Failed to load project. Please try again.',
          icon: 'error'
        } as any);
      } finally {
        (swal as any).close?.();
      }
    });

    if (isPathOnHomePage($page.url.pathname)) {
        arduinoLoopBlockShowNumberOfTimesThroughLoop();
      } else {
        arduinoLoopBlockShowLoopForeverText();
      }
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
    <Blockly {showLoopExecutionTimesArduinoStartBlock} />
  </div>
  
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
