<script lang="ts">
  import Player from './Player.svelte';
  import SimDebugger from './SimDebugger.svelte';
  import LedColorChanger from './LedColorChanger.svelte';
  import { SVG, type Svg } from '@svgdotjs/svg.js';
  import frameStore from '../../../stores/frame.store';
  import currentFrameStore from '../../../stores/currentFrame.store';
  import { resizeStore, WindowType } from '../../../stores/resize.store';
  import paint from '../../../core/virtual-circuit/paint';
  import update from '../../../core/virtual-circuit/update';
  import { onMount, onDestroy, tick } from 'svelte';
  import { onErrorMessage } from '../../../help/alerts';
  import { mark, fail } from '$lib/telemetry/boot';
  import { captureEmulatorError } from '$lib/telemetry/sentry';
  import { arduinoComponentStateToId } from '../../../core/frames/arduino-component-id';
  import { waitForContainerSize } from './simulator-wait';
  import { centerCircuit } from '../../../core/virtual-circuit/centerCircuit';
  import { page } from '$app/stores';
  import type { ArduinoFrame } from '../../../core/frames/arduino.frame';

  let container: HTMLElement;
  let frames: ArduinoFrame[] = [];
  let currentFrame: ArduinoFrame | undefined = undefined;
  let draw: Svg;
  let unsubscribes: (() => void)[] = [];
  let firstPaint = false;
  onMount(async () => {
    try {
      await import('@svgdotjs/svg.draggable.js');
      await import('@svgdotjs/svg.panzoom.js');
      mark('sim:imports-ok');
    } catch (e) {
      fail('sim:imports', e);
      onErrorMessage('Please refresh your browser and try again.', e);
    }

    // Wait for the container to be laid out. Replaces the old 5s busy-poll that
    // gave up permanently (dead canvas, no subscriptions) — WL-008.
    const waitForLayout = (timeoutMs: number) =>
      waitForContainerSize(container, {
        observe: (onResize) => {
          const ro = new ResizeObserver(onResize);
          ro.observe(container);
          return () => ro.disconnect();
        },
        timeoutMs,
      });

    let size;
    try {
      size = await waitForLayout(5000);
    } catch {
      fail('sim:no-container-size', {
        width: container.clientWidth - 10,
        height: container.clientHeight - 10,
      });
      // ponytail: toast deleted — the Infinity wait below recovers silently,
      // so the error message only scared users about a transient layout race
      // Don't dead-end: keep waiting (ResizeObserver, no polling) until the
      // container is laid out, then initialize so the circuit still draws.
      size = await waitForLayout(Number.POSITIVE_INFINITY);
    }

    // Root cause of the blank emulator (see pnpm override in package.json):
    // duplicate @svgdotjs/svg.js copies made .panZoom() undefined. The SVG
    // canvas and pan/zoom are now failure-isolated — a plugin problem can
    // never again skip the store subscriptions below (they do the painting).
    try {
      draw = SVG()
        .addTo(container)
        .size(size.width, size.height)
        .viewbox(0, 0, size.width, size.width);
    } catch (e) {
      fail('sim:svg-init', e);
      onErrorMessage('Simulator failed to start. Please refresh your browser.', e);
      return;
    }
    try {
      if (typeof (draw as unknown as { panZoom?: () => unknown }).panZoom === 'function') {
        draw.panZoom();
      } else {
        fail('sim:panZoom-missing', new Error('panZoom plugin not attached — emulator will lack pan/zoom'));
      }
    } catch (e) {
      fail('sim:panZoom', e);
    }
    mark('sim:svg-created', { width: size.width, height: size.height });

    unsubscribes.push(
      frameStore.subscribe((frameContainer) => {
        if (!firstPaint) {
          firstPaint = true;
          mark('sim:first-paint', { frameCount: frameContainer.frames.length });
        }
        let oldLastFrame = frames.length > 0 ? frames[frames.length - 1] : undefined;
        frames = frameContainer.frames;
        const firstFrame = frames ? frames[0] : undefined;
        const lastFrame = frames ? frames[frames.length - 1] : undefined;
        currentFrame = firstFrame;
        // WL-011: capture at the render hot path — a svelte:boundary never caught
        // errors thrown in this store subscription (outside the render cycle).
        try {
          paint(draw, frameContainer);
          update(draw, firstFrame);
        } catch (error) {
          captureEmulatorError(error);
        }

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
        try {
          update(draw, currentFrame);
        } catch (error) {
          captureEmulatorError(error);
        }
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
