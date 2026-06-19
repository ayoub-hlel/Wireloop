<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { Snippet } from 'svelte';
  let { children }: { children: Snippet } = $props();
  import debounce from 'lodash/debounce';
  import config from '../../env';
  import { isPathOnHomePage } from '../../helpers/is-path-on-homepage';
  import Nav from '../../components/wireloop/Nav.svelte';
  import Blockly from '../../components/wireloop/Blockly.svelte';
  import { resizeStore } from '../../stores/resize.store';
  import { page } from '$app/stores';
  // TODO: CLERK_REMOVAL — do not delete yet.
  const initializeClerkAuth = () => {};
  const authState = { subscribe: (cb: any) => { cb({ isLoaded: true, isSignedIn: false }); return () => {}; } };
  const user = { subscribe: (cb: any) => { cb(null); return () => {}; } };
  const userId = { subscribe: (cb: any) => { cb(null); return () => {}; } };
  const isSignedIn = { subscribe: (cb: any) => { cb(false); return () => {}; } };

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


  let showScrollOnRightSide = $state(false);
  let showLoopExecutionTimesArduinoStartBlock = $derived(isPathOnHomePage($page.url.pathname));
  let height = $state('500px');
  let middleFlex = $state(59.5);
  let rightFlex = $state(39.5);
  let leftFlex = $state(0);
  let isResizingLeft = false;
  let isResizingRight = false;

  function startResize(side: string) {
    if (side == 'right') {
      isResizingRight = true;
    } else {
      isResizingLeft = true;
    }
  }

  function stopResize() {
    isResizingRight = false;
    isResizingLeft = false;
  }

  const resize = (side: string) => {
    return (e : MouseEvent) => {
      if (!isResizingLeft && side == 'left') return;
      if (!isResizingRight && side == 'right') return;

      const windowWidth = window.innerWidth;
      if (e.clientX < 20 || windowWidth - e.clientX < 20) return;

      if (side == 'right') {
        rightFlex = ((windowWidth - e.clientX) / windowWidth) * 100;
      } else {
        leftFlex = (e.clientX / windowWidth) * 100;
      }
      leftFlex = 0;
      middleFlex = 100 - rightFlex - leftFlex - 1;
      resizeStore.mainWindow();
    };
  };

  const resizeRightSide = debounce(resize('right'), 2);
  const resizeLeftSide = debounce(resize('left'), 2);

  function resizeHeight() {
    const navBarHeight = 56;
    height = window.innerHeight - navBarHeight + 'px';
    setTimeout(() => {
      resizeStore.mainWindow();
    }, 5);
  }

  onMount(async () => {
    console.log('🚀 Wireloop: Initializing application services...');
    initializeClerkAuth();
    initializeConvexClient();
    localStorage.removeItem('no_alert');
    
    page.subscribe(({ url }) => {
      if (
        ['open', 'settings', 'lessons', 'code'].reduce((found, value) => {
          return found || url.pathname.indexOf(value) >= 0;
        }, false)
      ) {
        showScrollOnRightSide = true;
      } else {
        showScrollOnRightSide = false;
      }
      resizeHeight();
    });

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

    // @ts-ignore
    authState.subscribe(async (clerkAuth: any) => {
      if (!clerkAuth.isLoaded) return;

      if (!clerkAuth.isSignedIn || !clerkAuth.user) {
        authStore.set({ isLoggedIn: false, uid: null, legacyControlled: false });
        return;
      }

      authStore.set({ isLoggedIn: true, uid: clerkAuth.user.id, legacyControlled: false });

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
          userId: clerkAuth.user.id 
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

<Nav />
<svelte:body onmouseup={stopResize} />
<main
  style="height: {height}"
  onmousemove={(e) => { resizeLeftSide(e); resizeRightSide(e); }}
  class="bg-bg text-text w-full flex box-border overflow-hidden"
>
  <div style="flex: {middleFlex}" id="middle_panel" class="relative overflow-hidden border-r border-border">
    <Blockly {showLoopExecutionTimesArduinoStartBlock} />
  </div>
  
  <div 
    onmousedown={() => startResize('right')} 
    class="w-1.5 cursor-col-resize bg-border hover:bg-primary/50 transition-colors flex items-center justify-center relative z-10"
    role="separator"
    aria-label="Resize panels"
  >
    <div class="h-8 w-[1px] bg-primary/30"></div>
  </div>

  <div
    style="flex: {rightFlex}"
    class="bg-bg-surface overflow-hidden relative"
    class:overflow-y-auto={showScrollOnRightSide}
    class:opacity-0={rightFlex < 5}
    class:pointer-events-none={rightFlex < 5}
    id="right_panel"
  >
    <div class="p-4 h-full min-h-full flex flex-col">
      <div class="flex-1 min-h-0">
        {@render children()}
      </div>
    </div>
  </div>
</main>

<svelte:window on:resize={resizeHeight} />

<style>
  #right_panel::-webkit-scrollbar {
    width: 6px;
  }
  #right_panel::-webkit-scrollbar-track {
    background: #0A0E14;
  }
  #right_panel::-webkit-scrollbar-thumb {
    background: #1E3A5F;
    border-radius: 2px;
  }
  #right_panel::-webkit-scrollbar-thumb:hover {
    background: #2563EB;
  }
</style>
