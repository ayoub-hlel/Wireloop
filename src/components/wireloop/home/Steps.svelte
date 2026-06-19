<script lang="ts">
  import frameStore from "../../../stores/frame.store";
  import currentStepStore from "../../../stores/currentStep.store";
  import currentFrameStore from "../../../stores/currentFrame.store";
  import { onDestroy } from "svelte";
  import type { ArduinoFrame } from "../../../core/frames/arduino.frame";

  let stepContainer: HTMLElement;
  let frames: ArduinoFrame[] = $state([]);
  let unsubscribes: (() => void)[] = [];

  unsubscribes.push(
    frameStore.subscribe((frameContainer) => {
      frames = frameContainer.frames;
    })
  );

  onDestroy(() => {
    unsubscribes.forEach((unSubFunc) => unSubFunc());
  });

  $effect(() => {
    // Guard: bind:this is undefined during SSR/hydration first pass
    if (!stepContainer) return;
    // Track current step as a reactive dependency so we re-scroll on change
    const _step = $currentStepStore;
    const activeStep = stepContainer.querySelector(".current");
    if (activeStep) {
      activeStep.scrollIntoView({ block: "center", behavior: 'smooth' });
    }
  });

  function changeFrame(index: number) {
    currentFrameStore.set(frames[index]);
    currentStepStore.set(index);
  }
</script>

<div bind:this={stepContainer} class="w-full min-h-full bg-bg-surface p-4" id="steps">
  <div class="space-y-3">
    {#each frames as frame, i (i)}
      <div
        onclick={() => changeFrame(i)}
        onkeydown={(e) => e.key === 'Enter' && changeFrame(i)}
        role="button"
        tabindex="0"
        class="card-schematic p-4 cursor-pointer transition-all duration-200 group"
        class:current={i === $currentStepStore}
        class:active={i === $currentStepStore}
      >
        <div class="flex items-start space-x-4">
          <div class="pin-label flex-shrink-0 mt-0.5">
            Step {i + 1}
          </div>
          <div class="flex-grow font-sans text-sm leading-relaxed" class:text-primary={i === $currentStepStore}>
            {frame.explanation}
          </div>
        </div>
        
        {#if i === $currentStepStore}
          <div class="mt-2 flex items-center space-x-2">
            <span class="led led-blue"></span>
            <span class="font-mono text-[10px] uppercase tracking-tighter opacity-50">Active State</span>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .card-schematic.current {
    border-color: var(--color-primary);
    box-shadow: var(--shadow-glow-blue);
    background-color: color-mix(in srgb, var(--color-primary) 5%, transparent);
  }
  
  #steps::-webkit-scrollbar { width: 6px; }
  #steps::-webkit-scrollbar-track { background: hsl(var(--background)); }
  #steps::-webkit-scrollbar-thumb {
    background: hsl(var(--border));
    border-radius: var(--radius);
  }
  #steps::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground)); }
</style>
