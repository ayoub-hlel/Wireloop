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
  import { tooltip } from "@svelte-plugins/tooltips";

  let frames: ArduinoFrame[] = [];
  let frameNumber = 1;
  let playing = false;
  let speedDivisor = 1;
  let maxTimePerStep = 1000;

  const unsubscribes: Array<() => void> = [];

  $: setCurrentFrame(frameNumber);
  $: disablePlayer = frames.length === 0;
  $: frameIndex = frameNumber - 1;

  unsubscribes.push(
    currentStepStore.subscribe((currentIndex) => {
      frameNumber = currentIndex;
    })
  );

  unsubscribes.push(
    frameStore.subscribe((frameContainer) => {
      playing = false;
      const currentFrame = frames[frameNumber];
      frames = frameContainer.frames;

      if (frames.length === 0 || !currentFrame) {
        frameNumber = frames.findIndex(
          (f) => f.timeLine.function == "loop" && f.timeLine.iteration == 1
        );
        frameNumber = frameNumber < 0 ? 0 : frameNumber;
        if (frames.length > 0) {
          currentFrameStore.set(frames[frameNumber]);
        }
        return;
      }

      frameNumber = navigateToClosestTimeline(currentFrame.timeLine);
      currentFrameStore.set(frames[frameNumber]);
    })
  );

  unsubscribes.push(
    settingStore.subscribe((newSettings) => {
      maxTimePerStep = (newSettings as any).maxTimePerMove ?? 1000;
    })
  );

  function navigateToClosestTimeline(timeLine: { function: string; iteration: number }) {
    if (timeLine.function !== "loop" || timeLine.iteration <= 1) {
      frameNumber = frames.findIndex(
        (f) => f.timeLine.function == "loop" && f.timeLine.iteration == 1
      );
      return frameNumber < 0 ? 0 : frameNumber;
    }
    const lastFrameTimeLine = frames[frames.length - 1].timeLine;
    if (timeLine.iteration > lastFrameTimeLine.iteration) {
      const loopNumber = lastFrameTimeLine.iteration;
      return frames.findIndex((f) => f.timeLine.iteration === loopNumber);
    }
    const loopNumber = timeLine.iteration;
    return frames.findIndex((f) => f.timeLine.iteration === loopNumber);
  }

  function setCurrentFrame(frameNum: number) {
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
      currentFrameStore.set(frames[frameIndex]);
      getAllBlocks().forEach((b) => b.unselect());
    } catch (e) {
      onErrorMessage("Please refresh your browser and try again.", e);
    }
  }

  function moveSlider() {
    currentFrameStore.set(frames[frameIndex]);
    playing = false;
  }

  function prev() {
    playing = false;
    if (frameNumber <= 0) return;
    frameNumber -= 1;
    currentFrameStore.set(frames[frameIndex]);
  }

  function next() {
    playing = false;
    if (isLastFrame()) return;
    frameNumber += 1;
    currentFrameStore.set(frames[frameIndex]);
  }

  function isLastFrame() { return frameNumber >= frames.length - 1; }
  function moveWait() { return new Promise((resolve) => setTimeout(resolve, (maxTimePerStep || 1000) / speedDivisor)); }
  function wait(msTime: number) { return new Promise((resolve) => setTimeout(resolve, msTime)); }

  onDestroy(async () => {
    if (is_browser()) await resetPlayer();
    unsubscribes.forEach((unSubFunc) => unSubFunc());
  });
</script>

<div class="px-6 py-2 flex flex-col justify-center h-full w-full bg-bg-surface">
  <div class="w-full relative group">
    <input
      on:input={moveSlider}
      type="range"
      min="0"
      disabled={frames.length === 0}
      bind:value={frameNumber}
      max={frames.length === 0 ? 0 : frames.length - 1}
      class="input-range-schematic"
      id="scrub-bar"
    />
  </div>

  <div class="flex items-center justify-center mt-2 space-x-4">
    <div class="flex items-center space-x-2">
      <button
        use:tooltip={{}}
        title="Previous Step"
        on:click={prev}
        disabled={disablePlayer || frameNumber <= 0}
        class="p-2 text-primary/60 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <i class="fa fa-step-backward text-xl"></i>
      </button>

      <button
        use:tooltip={{}}
        title={playing ? "Stop" : "Play"}
        on:click={play}
        disabled={disablePlayer}
        class="w-12 h-12 flex items-center justify-center rounded-full border-2 border-primary/40 text-primary hover:bg-primary/10 hover:border-primary transition-all active:scale-95 shadow-glow-blue/20"
      >
        {#if playing}
          <i class="fa fa-stop text-lg"></i>
        {:else}
          <i class="fa fa-play text-lg ml-1"></i>
        {/if}
      </button>

      <button
        use:tooltip={{position: "top"}}
        title="Next Step"
        on:click={next}
        disabled={disablePlayer || isLastFrame()}
        class="p-2 text-primary/60 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <i class="fa fa-step-forward text-xl"></i>
      </button>
    </div>
    
    <div class="absolute right-6 flex items-center space-x-3">
      <div class="font-mono text-[10px] uppercase tracking-widest text-text-muted">
        Step
      </div>
      <div class="data-readout py-1 px-3 min-w-[60px] text-center border-primary/30">
        {frameNumber}
      </div>
      <div class="font-mono text-[10px] uppercase tracking-widest text-text-muted">
        / {frames.length > 0 ? frames.length - 1 : 0}
      </div>
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
