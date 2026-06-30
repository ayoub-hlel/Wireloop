<script lang="ts">
  import Player from './Player.svelte';
  import SimDebugger from './SimDebugger.svelte';
  import LedColorChanger from './LedColorChanger.svelte';
  import { SVG, type Svg } from '@svgdotjs/svg.js';
  import frameStore from '../../../stores/frame.store';
  import currentFrameStore from '../../../stores/currentFrame.store';
  import settings from '../../../stores/settings.store';
  import { resizeStore, WindowType } from '../../../stores/resize.store';
  import paint from '../../../core/virtual-circuit/paint';
  import update from '../../../core/virtual-circuit/update';
  import { onMount, onDestroy, tick } from 'svelte';
  import { onErrorMessage } from '../../../help/alerts';
  import { wait } from '../../../helpers/wait';
  import { arduinoComponentStateToId } from '../../../core/frames/arduino-component-id';
  import { centerCircuit } from '../../../core/virtual-circuit/centerCircuit';
  import { page } from '$app/stores';
  import type { ArduinoFrame } from '../../../core/frames/arduino.frame';

  let container: HTMLElement;
  let frames: ArduinoFrame[] = [];
  let currentFrame: ArduinoFrame | undefined = undefined;
  let draw: Svg;
  let unsubscribes: (() => void)[] = [];
  onMount(async () => {
    try {
      await import('@svgdotjs/svg.draggable.js');
      await import('@svgdotjs/svg.panzoom.js');
    } catch (e) {
      onErrorMessage('Please refresh your browser and try again.', e);
    }

    let width = container.clientWidth - 10;
    let height = container.clientHeight - 10;
    let count = 0;
    while (width < 0 || height < 0) {
      width = container.clientWidth - 10;
      height = container.clientHeight - 10;
      await wait(5);
      count += 1;
      if (count > 1000) {
        onErrorMessage('There is not enough room to render the Arduino', {});
        return;
      }
    }

    draw = SVG()
      .addTo(container)
      .size(container.clientWidth - 10, container.clientHeight - 10)
      .viewbox(0, 0, container.clientWidth - 10, container.clientWidth - 10)
      .panZoom();

    unsubscribes.push(
      frameStore.subscribe((frameContainer) => {
        let oldLastFrame = frames.length > 0 ? frames[frames.length - 1] : undefined;
        frames = frameContainer.frames;
        const firstFrame = frames ? frames[0] : undefined;
        const lastFrame = frames ? frames[frames.length - 1] : undefined;
        currentFrame = firstFrame;
        paint(draw, frameContainer);
        update(draw, firstFrame);

        const oldListOfComponentIds = oldLastFrame
          ? oldLastFrame.components.map((f) => { try { return arduinoComponentStateToId(f); } catch { return ''; } }).join('')
          : '';

        const newListOfComponentIds = lastFrame
          ? lastFrame.components.map((f) => { try { return arduinoComponentStateToId(f); } catch { return ''; } }).join('')
          : '';

        if (newListOfComponentIds != oldListOfComponentIds) {
          centerCircuit(draw, lastFrame);
        }
      })
    );

    unsubscribes.push(
      currentFrameStore.subscribe((frame) => {
        currentFrame = frame;
        update(draw, currentFrame);
      })
    );

    unsubscribes.push(
      resizeStore.subscribe(async ({ type }) => {
        if (!container) return;
        draw.size(container.clientWidth - 10, container.clientHeight - 10);
        if (type == WindowType.MAIN) {
          await tick();
          await tick();
          reCenter();
        }
      })
    );

    unsubscribes.push(
      page.subscribe(() => {
        if (draw) {
          const lastFrame = frames ? frames[frames.length - 1] : undefined;
          centerCircuit(draw, lastFrame);
        }
      })
    );
  });

  function zoomIn() { draw.zoom(draw.zoom() + 0.05); }
  function zoomOut() { draw.zoom(draw.zoom() - 0.05); }
  function reCenter() {
    if (draw) {
      centerCircuit(draw, frames.length > 0 ? frames[frames.length - 1] : undefined);
    }
  }

  onDestroy(() => { unsubscribes.forEach((unSubFunc) => unSubFunc()); });
</script>

<div class="relative w-full h-full flex flex-col bg-bg overflow-hidden" id="container">
  <LedColorChanger />
  
  <div 
    bind:this={container} 
    id="simulator" 
    class="flex-grow w-full min-h-0 bg-grid-schematic"
    style="background-size: 24px 24px;"
  ></div>
  
  <div id="simulator-controls" class="absolute" style="right: 16px; bottom: 91px; display: flex; align-items: center; gap: 8px; z-index: 20;">
    <button onclick={reCenter} class="btn-schematic p-2 w-10 h-10 flex items-center justify-center group" title="Recenter">
      <i class="fa fa-crosshairs text-lg group-hover:scale-110 transition-transform"></i>
    </button>
    <button onclick={zoomIn} class="btn-schematic p-2 w-10 h-10 flex items-center justify-center group" title="Zoom In">
      <i class="fa fa-plus text-lg group-hover:scale-110 transition-transform"></i>
    </button>
    <button onclick={zoomOut} class="btn-schematic p-2 w-10 h-10 flex items-center justify-center group" title="Zoom Out">
      <i class="fa fa-minus text-lg group-hover:scale-110 transition-transform"></i>
    </button>
  </div>

  <div class="absolute" style="left: 16px; bottom: 91px; z-index: 20;">
    <SimDebugger />
  </div>

  <div class="h-[75px] shrink-0 border-t border-border bg-bg-surface">
    <Player />
  </div>
</div>

<style>
  #simulator {
    cursor: grab;
  }
  #simulator:active {
    cursor: grabbing;
  }
</style>
