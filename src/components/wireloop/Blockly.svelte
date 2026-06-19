<script lang="ts">
  import Blockly from 'blockly';
  import type { WorkspaceSvg } from 'blockly';
  import { onMount, onDestroy } from 'svelte';
  import { WindowType, resizeStore } from '../../stores/resize.store';
  import startBlocly from '../../core/blockly/startBlockly';
  import currentFrameStore from '../../stores/currentFrame.store';
  import arduinoStore from '../../stores/arduino.store';
  import arduinoMessageStore from '../../stores/arduino-message.store';
  import {
    arduinoLoopBlockShowLoopForeverText,
    arduinoLoopBlockShowNumberOfTimesThroughLoop,
  } from '../../core/blockly/helpers/arduino_loop_block.helper';
  import {
    getAllBlocks,
    getBlockById,
  } from '../../core/blockly/helpers/block.helper';
  import updateLoopblockStore from '../../stores/update-loopblock.store';
  import { workspaceToXML } from '../../core/blockly/helpers/workspace.helper';

  let { showLoopExecutionTimesArduinoStartBlock = true }: { showLoopExecutionTimesArduinoStartBlock: boolean } = $props();
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

  onMount(() => {
    (window as any).Blockly = Blockly;
    startBlocly(blocklyElement);
    workspaceInitialize = true;
    resizeBlockly();
    setTimeout(() => {
      resizeBlockly();
      fixFlyoutScrollbarVisibility();
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
  });

  unsubscribes.push(
    resizeStore.subscribe((event) => {
      if (event.type == WindowType.MAIN) {
        resizeBlockly();
      }
    })
  );

  unsubscribes.push(
    arduinoStore.subscribe((m) => console.log(m, 'arduino store blockly component'))
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

  function resizeBlockly() {
    if (Blockly.getMainWorkspace()) {
      Blockly.svgResize(Blockly.getMainWorkspace() as WorkspaceSvg);
    }
  }

  onDestroy(() => {
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
    fill: #0A0E14 !important;
  }
</style>
