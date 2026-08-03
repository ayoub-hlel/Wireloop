<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import type { Element } from "@svgdotjs/svg.js";

  import {
    ledColors,
    lightColorsShades,
  } from "../../../blocks/led/virtual-circuit";

  let showLedChanger = false;
  let ledEl: Element | null = null;
  let ledColor: string = "";

  function onLedColorShow(e: Event) {
    ledEl = e.detail.componentEl;
    ledColor = ledEl.data("color");
    showLedChanger = true;
  }

  onMount(() => {
    document.addEventListener("led-color-show", onLedColorShow);
  });

  // WL-013: remove the document listener on teardown — this component's global
  // listener was a leak on every /studio mount/unmount cycle.
  onDestroy(() => {
    document.removeEventListener("led-color-show", onLedColorShow);
  });

  function changeColor(e: Event) {
    ledColor = (e.target as HTMLElement).getAttribute("data-color") || "";
    let ledLightColor = lightColorsShades[ledColor];

    ledEl.data("color", ledColor);
    const mainColor = ledEl.findOne("#MAIN_COLOR") as Element;
    mainColor.fill(ledColor);
    const secondColorEl = ledEl.findOne("#SECOND_COLOR") as Element;
    secondColorEl.fill(ledLightColor);
  }

  function close() {
    showLedChanger = false;
    ledEl = null;
  }
</script>

{#if showLedChanger}
  <section class="container" id="led-color-changer">
    <div class="row">
      <div class="col color-container">
        {#each ledColors as color (color)}
          <button
            type="button"
            class="color {color}"
            onclick={changeColor}
            style="background-color: {color};"
            data-color={color}
            class:selected={ledColor == color}
            id={color}
            aria-label="Select {color} LED color"
            aria-pressed={ledColor == color}
          ></button>
        {/each}
      </div>
    </div>
    <div class="row">
      <div class="col">
        <button
          id="close-btn-led"
          class="w-full px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700"
          onclick={close}
        >
          Close
        </button>
      </div>
    </div>
  </section>
{/if}

<style>
  #led-color-changer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100px;
    background-color: #fff;
    z-index: 20;
  }
  :global(#close-btn-led) {
    width: 100%;
  }
  .color {
    flex: 1;
    margin: 2px;
    height: 30px;
    cursor: pointer;
  }
  .color-container {
    display: flex;
  }
  .selected {
    border: black 10px dashed;
  }
</style>
