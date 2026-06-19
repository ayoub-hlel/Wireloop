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

  onMount(() => {
    (window as any).Blockly = Blockly;
    startBlocly(blocklyElement);
    workspaceInitialize = true;
    resizeBlockly();
    setTimeout(() => { resizeBlockly(); }, 200);

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
