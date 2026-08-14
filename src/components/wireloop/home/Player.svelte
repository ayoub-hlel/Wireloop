<script lang="ts">
  import { onDestroy } from "svelte";
  import frameStore from "../../../stores/frame.store";
  import currentFrameStore from "../../../stores/currentFrame.store";
  import currentStepStore from "../../../stores/currentStep.store";
  import settingStore from "../../../stores/settings.store";
  import { onErrorMessage } from "../../../help/alerts";
  import { getAllBlocks } from "../../../core/blockly/helpers/block.helper";
  import is_browser from "../../../helpers/is_browser";
  import type { ArduinoFrame } from "../../../core/frames/arduino.frame";
  import { tooltip } from "$lib/tooltip";
  import {
    firstLoopFrameIndex,
    navigateToClosestTimeline,
  } from "./player-navigation";

  // frameNumber is the 0-based index into `frames` (WL-010: was mixed 0/1-based
  // across controls, causing off-by-one playback and undefined at boot).
  let frames: ArduinoFrame[] = $state([]);
  let frameNumber = $state(0);
  let playing = $state(false);
  let speedDivisor = 1;
  let maxTimePerStep = 1000;

  const unsubscribes: Array<() => void> = [];

  $effect(() => { setCurrentFrame(frameNumber); });
  let disablePlayer = $derived(frames.length === 0);

  unsubscribes.push(
    currentStepStore.subscribe((currentIndex) => {
      frameNumber = currentIndex;
    })
  );

  unsubscribes.push(
    frameStore.subscribe((frameContainer) => {
      playing = false;
      const currentFrame = frames[frameNumber];
      // Keep Svelte's reactive proxy out of identity-sensitive frame helpers.
      frames = [...frameContainer.frames];

      if (frames.length === 0 || !currentFrame) {
        frameNumber = firstLoopFrameIndex(frames);
        if (frames.length > 0) {
          currentFrameStore.set(frames[frameNumber]);
        }
        return;
      }

      frameNumber = navigateToClosestTimeline(frames, currentFrame.timeLine);
      currentFrameStore.set(frames[frameNumber]);
    })
  );

  unsubscribes.push(
    settingStore.subscribe((newSettings) => {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      maxTimePerStep = (newSettings as any).maxTimePerMove ?? 1000;
    })
  );

  // Never set the current frame to `undefined` (e.g. boot with empty frames,
  // or out-of-range index) — WL-010.
  function setCurrentFrame(frameNum: number) {
    if (!frames[frameNum]) return;
    currentFrameStore.set(frames[frameNum]);
    currentStepStore.set(frameNum);
  }

  async function play() {
    playing = !playing;
    if (playing && isLastFrame()) { frameNumber = 0; }
    if (playing) {
      try {
        playing = true;
        await moveWait();
        await playFrame();
      } catch (e) {
        onErrorMessage("Please refresh your browser and try again.", e);
      }
    }
  }

  async function playFrame() {
    if (!playing || isLastFrame()) return;
    if (frames[frameNumber].delay > 0) { await wait(frames[frameNumber].delay); }
    currentFrameStore.set(frames[frameNumber]);
    frameNumber += 1;
    await moveWait();
    await playFrame();
    if (isLastFrame()) playing = false;
  }

  async function resetPlayer() {
    try {
      frameNumber = 0;
      playing = false;
      setCurrentFrame(frameNumber);
      getAllBlocks().forEach((b) => b.unselect());
    } catch (e) {
      onErrorMessage("Please refresh your browser and try again.", e);
    }
  }

  function moveSlider() {
    setCurrentFrame(frameNumber);
    playing = false;
  }

  function prev() {
    playing = false;
    if (frameNumber <= 0) return;
    frameNumber -= 1;
    setCurrentFrame(frameNumber);
  }

  function next() {
    playing = false;
    if (isLastFrame()) return;
    frameNumber += 1;
    setCurrentFrame(frameNumber);
  }

  function isLastFrame() { return frameNumber >= frames.length - 1; }
  function moveWait() { return new Promise((resolve) => setTimeout(resolve, (maxTimePerStep || 1000) / speedDivisor)); }
  function wait(msTime: number) { return new Promise((resolve) => setTimeout(resolve, msTime)); }

  onDestroy(async () => {
    if (is_browser()) await resetPlayer();
    unsubscribes.forEach((unSubFunc) => unSubFunc());
  });
</script>

<div class="h-full w-full flex flex-col justify-center bg-bg-surface px-6 -mt-1">
  <div class="w-full relative group">
    <input
      oninput={moveSlider}
      type="range"
      min="0"
      disabled={frames.length === 0}
      bind:value={frameNumber}
      max={frames.length === 0 ? 0 : frames.length - 1}
      class="input-range-schematic"
      id="scrub-bar"
    />
  </div>

  <div class="flex items-center justify-between">
    <div class="flex items-center gap-1.5 ml-3">
      <button
        use:tooltip={{}}
        title="Previous Step"
        onclick={prev}
        disabled={disablePlayer || frameNumber <= 0}
        class="p-1 text-primary/60 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <i class="fa fa-step-backward text-base"></i>
      </button>

      <button
        use:tooltip={{}}
        title={playing ? "Stop" : "Play"}
        onclick={play}
        disabled={disablePlayer}
        class="w-8 h-8 flex items-center justify-center rounded-full border-2 border-primary/40 text-primary hover:bg-primary/10 hover:border-primary transition-all active:scale-95"
      >
        {#if playing}
          <i class="fa fa-stop text-[10px]"></i>
        {:else}
          <i class="fa fa-play text-[10px] ml-0.5"></i>
        {/if}
      </button>

      <button
        use:tooltip={{position: "top"}}
        title="Next Step"
        onclick={next}
        disabled={disablePlayer || isLastFrame()}
        class="p-1 text-primary/60 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <i class="fa fa-step-forward text-base"></i>
      </button>
    </div>

    <div class="font-mono text-[10px] text-text-muted tracking-wider whitespace-nowrap mr-2">
      {frames.length > 0 ? frameNumber + 1 : 0} / {frames.length}
    </div>
  </div>
</div>

<style>
  .input-range-schematic {
    width: 100%;
    height: 4px;
    background-color: var(--color-border);
    border-radius: 9999px;
    appearance: none;
    cursor: pointer;
    outline: none;
    transition: all 0.2s;
    background-image: linear-gradient(var(--color-primary), var(--color-primary));
    background-repeat: no-repeat;
    background-size: 0% 100%;
  }

  .input-range-schematic::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 12px;
    background-color: var(--color-bg);
    border: 2px solid var(--color-primary);
    border-radius: 9999px;
    box-shadow: var(--shadow-glow-blue);
    transition: transform 0.2s;
  }

  .input-range-schematic::-webkit-slider-thumb:hover {
    transform: scale(1.25);
  }

  .input-range-schematic::-moz-range-thumb {
    width: 12px;
    height: 12px;
    background-color: var(--color-bg);
    border: 2px solid var(--color-primary);
    border-radius: 9999px;
    box-shadow: var(--shadow-glow-blue);
    transition: transform 0.2s;
  }

  .input-range-schematic::-moz-range-thumb:hover {
    transform: scale(1.25);
  }

  .input-range-schematic:disabled {
    cursor: not-allowed;
    opacity: 0.3;
  }
</style>
