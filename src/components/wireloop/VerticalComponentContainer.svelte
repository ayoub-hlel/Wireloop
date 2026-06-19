<script lang="ts">
  import { onMount } from 'svelte';
  import { resizeStore } from '../../stores/resize.store';

  const MIN_PANEL = 100;
  const GRABBER_HEIGHT = 6; // h-1.5 = 6px

  let top = 300;
  let bottom = 200;
  let isResizing = false;
  let initialRatio = 0.55;
  let mainSection: HTMLElement;
  let previousMainHeight = 0;

  function startResize() { isResizing = true; }
  function stopResize() { isResizing = false; }

  const onResize = (e: MouseEvent) => { resize(e.clientY); };

  function onResizeWindow(e: Event) {
    setTimeout(() => {
      if (Math.abs(previousMainHeight - mainSection.clientHeight) < 100) return;
      previousMainHeight = mainSection.clientHeight;
      const available = mainSection.clientHeight - GRABBER_HEIGHT;
      top = Math.max(MIN_PANEL, Math.min(available - MIN_PANEL, Math.round(available * initialRatio)));
      bottom = available - top;
      resizeStore.sideWindow();
    }, 5);
  }

  const resize = (clientY: number) => {
    if (!isResizing) return;
    const navBarHeight = document.querySelector('nav')?.clientHeight || 56;
    const clientRelativeToContainer = clientY - navBarHeight;
    const mainHeight = mainSection.clientHeight;

    // Clamp: ensure both panels stay above minimum
    const proposedTop = Math.max(
      MIN_PANEL,
      Math.min(mainHeight - MIN_PANEL - GRABBER_HEIGHT, clientRelativeToContainer - GRABBER_HEIGHT / 2)
    );
    const proposedBottom = mainHeight - proposedTop - GRABBER_HEIGHT;

    if (proposedTop < MIN_PANEL || proposedBottom < MIN_PANEL) return;

    top = proposedTop;
    bottom = proposedBottom;
    initialRatio = top / (top + bottom);
    resizeStore.sideWindow();
  };

  onMount(() => {
    setTimeout(() => {
      const totalHeight = mainSection.clientHeight;
      previousMainHeight = totalHeight;
      const available = totalHeight - GRABBER_HEIGHT;
      top = Math.max(MIN_PANEL, Math.min(available - MIN_PANEL, Math.round(available * initialRatio)));
      bottom = available - top;
    }, 1);
  });
</script>

<svelte:body on:mouseup={stopResize} />

<main
  on:mouseleave={stopResize}
  on:mousemove={onResize}
  bind:this={mainSection}
  class="h-full flex flex-col overflow-hidden"
  id="split-container"
>
  <section style="height: {top}px" id="top" class="overflow-hidden">
    <slot name="top" />
  </section>
  
  <div 
    on:mousedown={startResize} 
    id="grabber" 
    class="h-1.5 w-full cursor-row-resize bg-border hover:bg-primary/50 transition-colors flex items-center justify-center relative z-10 shrink-0"
    role="separator"
    aria-label="Resize panel"
  >
    <div class="w-8 h-[1px] bg-primary/30"></div>
  </div>

  <section style="height: {bottom}px" id="bottom" class="overflow-y-auto bg-bg-surface border-t border-border shadow-inset-trace shrink-0">
    <slot name="bottom" />
  </section>
</main>
<svelte:window on:resize={onResizeWindow} />

<style>
  #bottom::-webkit-scrollbar { width: 6px; }
  #bottom::-webkit-scrollbar-track { background: #0A0E14; }
  #bottom::-webkit-scrollbar-thumb {
    background: #1E3A5F;
    border-radius: 2px;
  }
  #bottom::-webkit-scrollbar-thumb:hover { background: #2563EB; }
</style>
