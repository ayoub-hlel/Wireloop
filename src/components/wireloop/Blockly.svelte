<script lang="ts">
  import type { WorkspaceSvg, BlockSvg } from 'blockly';
  import { onMount, onDestroy } from 'svelte';
  import { WindowType, resizeStore } from '../../stores/resize.store';
  import currentFrameStore from '../../stores/currentFrame.store';
  import arduinoMessageStore from '../../stores/arduino-message.store';
  import updateLoopblockStore from '../../stores/update-loopblock.store';
  import { mark } from '$lib/telemetry/boot';

  let { showLoopExecutionTimesArduinoStartBlock = true }: { showLoopExecutionTimesArduinoStartBlock: boolean } = $props();
  let Blockly: typeof import('blockly');
  let startBlocly: (el: HTMLElement) => void;
  let workspaceToXML: () => string | undefined;
  let getAllBlocks: () => BlockSvg[];
  let getBlockById: (id: string) => BlockSvg | undefined;
  let arduinoLoopBlockShowLoopForeverText: () => void;
  let arduinoLoopBlockShowNumberOfTimesThroughLoop: () => void;
  let blocklyElement: HTMLElement;
  let workspaceInitialize = false;
  const unsubscribes: Array<() => void> = [];

  $effect(() => {
    if (showLoopExecutionTimesArduinoStartBlock && workspaceInitialize) {
      arduinoLoopBlockShowNumberOfTimesThroughLoop();
    } else if (workspaceInitialize) {
      arduinoLoopBlockShowLoopForeverText();
    }
  });

  function syncFlyoutScrollbars() {
    // Pick the last flyout SVG (Blockly may keep old hidden ones)
    const all = document.querySelectorAll('.blocklyFlyout');
    const active = all[all.length - 1] as HTMLElement;
    const visible = active && active.style.display !== 'none';
    document.querySelectorAll('.blocklyFlyoutScrollbar').forEach((sb) => {
      const el = sb as HTMLElement;
      el.style.setProperty('display', visible ? 'block' : 'none', 'important');
    });
  }

  function fixFlyoutScrollbarVisibility() {
    // Blockly uses SVG display="none" attribute to hide flyout scrollbars,
    // but for outermost <svg> elements this has lower priority than the UA
    // stylesheet's `svg { display: block }`, so the scrollbar stays visible
    // after the flyout closes. This observer tracks ALL flyout SVGs' display
    // state and forces CSS display on all flyout scrollbar SVGs.
    const flyoutSvgs = document.querySelectorAll('.blocklyFlyout');
    if (!flyoutSvgs.length) return;
    const observer = new MutationObserver(() => syncFlyoutScrollbars());
    flyoutSvgs.forEach((svg) => {
      observer.observe(svg, { attributes: true, attributeFilter: ['style'] });
    });
    // Sync immediately to handle the initial state (observer won't fire if already stable)
    syncFlyoutScrollbars();
    unsubscribes.push(() => observer.disconnect());
  }

  function relocateToolbox() {
    const toolboxEl = document.querySelector('.blocklyToolboxDiv') as HTMLElement;
    const hostEl = document.getElementById('blockly-toolbox-host');
    if (toolboxEl && hostEl) {
      // Clear Blockly's absolute positioning so it flows naturally in our flex layout
      toolboxEl.style.position = 'relative';
      toolboxEl.style.top = 'auto';
      toolboxEl.style.right = 'auto';
      toolboxEl.style.width = '100%';
      toolboxEl.style.height = '100%';
      toolboxEl.style.left = 'auto';
      toolboxEl.style.bottom = 'auto';
      toolboxEl.style.overflowY = 'auto';
      toolboxEl.style.overflowX = 'hidden';
      hostEl.appendChild(toolboxEl);
    }
  }

  function fixFlyoutPosition() {
    // Blockly internally translates the flyout SVG by the toolbox width
    // (which is now our 180px sidebar). Reset the translation so the
    // flyout sits flush against the workspace left edge.
    const flyoutSvgs = document.querySelectorAll('.blocklyFlyout');
    flyoutSvgs.forEach((svg) => {
      const el = svg as HTMLElement;
      if (el.style.display !== 'none') {
        el.style.setProperty('transform', 'translate(0, 0)', 'important');
      }
    });
  }

  function watchFlyoutPosition() {
    const injectionDiv = document.querySelector('.injectionDiv');
    if (!injectionDiv) return;
    const observer = new MutationObserver(() => fixFlyoutPosition());
    observer.observe(injectionDiv, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['transform', 'style'],
    });
    fixFlyoutPosition();
    unsubscribes.push(() => observer.disconnect());
  }

  onMount(() => {
    mark('blockly:mount');
    (async () => {
      const blocklyModule = await import('blockly');
      Blockly = blocklyModule.default;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).Blockly = Blockly;

      const [sm, wm, bm, am] = await Promise.all([
        import('../../core/blockly/startBlockly'),
        import('../../core/blockly/helpers/workspace.helper'),
        import('../../core/blockly/helpers/block.helper'),
        import('../../core/blockly/helpers/arduino_loop_block.helper'),
      ]);

      startBlocly = sm.default;
      workspaceToXML = wm.workspaceToXML;
      getAllBlocks = bm.getAllBlocks;
      getBlockById = bm.getBlockById;
      arduinoLoopBlockShowLoopForeverText = am.arduinoLoopBlockShowLoopForeverText;
      arduinoLoopBlockShowNumberOfTimesThroughLoop = am.arduinoLoopBlockShowNumberOfTimesThroughLoop;

      startBlocly(blocklyElement);
      mark('blockly:workspace-created');
      workspaceInitialize = true;
      resizeBlockly();
      // ponytail: window resizeStore misses container-only resizes (sidebar
      // toggle, flex relayout) which left the canvas cramped — RO covers both
      const ro = new ResizeObserver(() => resizeBlockly());
      ro.observe(blocklyElement);
      unsubscribes.push(() => ro.disconnect());
      setTimeout(() => {
        relocateToolbox();
        resizeBlockly();
        fixFlyoutScrollbarVisibility();
        watchFlyoutPosition();
      }, 200);

      unsubscribes.push(
        currentFrameStore.subscribe((frame) => {
          if (!frame) return;
          getAllBlocks().forEach((b) => b.unselect());
          const selectedBlock = getBlockById(frame.blockId);
          if (selectedBlock) { selectedBlock.select(); }
        })
      );

      unsubscribes.push(
        updateLoopblockStore.subscribe(() => {
          if (showLoopExecutionTimesArduinoStartBlock && workspaceInitialize) {
            arduinoLoopBlockShowNumberOfTimesThroughLoop();
          } else if (workspaceInitialize) {
            arduinoLoopBlockShowLoopForeverText();
          }
        })
      );

      unsubscribes.push(
        resizeStore.subscribe((event) => {
          if (event.type == WindowType.MAIN) {
            resizeBlockly();
          }
        })
      );

      unsubscribes.push(
        arduinoMessageStore.subscribe((m) => {
          if (!m || m.type === 'Computer' || m.message.indexOf('DEBUG_BLOCK_') === -1) return;
          const blockId = m.message.replace('DEBUG_BLOCK_', '').trim();
          getAllBlocks().forEach((b) => b.unselect());
          const selectedBlock = getBlockById(blockId);
          if (selectedBlock) { selectedBlock.select(); }
        })
      );
    })();
  });

  function resizeBlockly() {
    if (Blockly.getMainWorkspace()) {
      Blockly.svgResize(Blockly.getMainWorkspace() as WorkspaceSvg);
    }
  }

  onDestroy(() => {
    mark('blockly:destroy');
    unsubscribes.forEach((unSubFunc) => unSubFunc());
    if (!workspaceInitialize) return;
    const recentBlocks = workspaceToXML() ?? '';
    localStorage.setItem('reload_once_workspace', recentBlocks);
  });
</script>

<section bind:this={blocklyElement} id="blockly" class="h-full w-full bg-bg"></section>

<style>
  :global(.blocklyWorkspace-schematic) {
    background-color: transparent !important;
  }
  :global(.blocklyMainBackground) {
    fill: hsl(var(--background)) !important;
  }
</style>
