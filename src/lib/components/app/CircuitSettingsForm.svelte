<script lang="ts">
  import type { Settings } from "../../../types/arduino-sim";
  import { MicroControllerType } from "../../../core/microcontroller/microcontroller";
  import { ledColors } from "../../../blocks/led/virtual-circuit";

  let { settings = $bindable() }: { settings: Settings } = $props();

  function changeLedColor(e: Event) {
    settings.ledColor = (e.target as HTMLElement).getAttribute("data-color") || "";
  }
</script>

<div class="circuit-settings">
  <div class="settings-field">
    <label for="boardType" class="settings-label">Microcontroller</label>
    <select bind:value={settings.boardType} id="boardType" class="settings-select">
      <option value={MicroControllerType.ARDUINO_UNO}>Arduino Uno</option>
      <option value={MicroControllerType.ARDUINO_MEGA}>Arduino Mega</option>
    </select>
  </div>

  <div class="settings-field">
    <label for="max-time-per-move" class="settings-label">Milliseconds per move</label>
    <input
      bind:value={settings.maxTimePerMove}
      type="number"
      id="max-time-per-move"
      class="settings-input"
    />
  </div>

  <div class="settings-field">
    <div class="settings-checkbox-row">
      <input
        type="checkbox"
        bind:checked={settings.customLedColor}
        id="custom-led-color"
        class="settings-checkbox"
      />
      <label for="custom-led-color" class="settings-label settings-label-inline">Custom LED color</label>
    </div>
  </div>

  {#if settings.customLedColor}
    <div class="settings-field">
      <span class="settings-label" id="led-color-label">LED color</span>
      <div class="color-grid" role="radiogroup" aria-labelledby="led-color-label">
        {#each ledColors as color (color)}
          <button
            type="button"
            class="color-swatch"
            class:selected={settings.ledColor === color}
            style="background-color: {color};"
            data-color={color}
            aria-label="Select {color} LED color"
            aria-pressed={settings.ledColor === color}
            onclick={changeLedColor}
          ></button>
        {/each}
      </div>
    </div>
  {/if}

  <div class="settings-field">
    <label for="touch-skin-color" class="settings-label">Touch sensor finger color</label>
    <div class="color-input-row">
      <input
        bind:value={settings.touchSkinColor}
        type="color"
        id="touch-skin-color"
        class="settings-color-input"
      />
      <span class="color-value">{settings.touchSkinColor}</span>
    </div>
  </div>

  <div class="settings-field">
    <label for="background-color" class="settings-label">Arduino background color</label>
    <div class="color-input-row">
      <input
        bind:value={settings.backgroundColor}
        type="color"
        id="background-color"
        class="settings-color-input"
      />
      <span class="color-value">{settings.backgroundColor}</span>
    </div>
  </div>
</div>

<style>
  .circuit-settings {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .settings-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .settings-label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: hsl(var(--foreground));
  }

  .settings-label-inline {
    margin: 0;
    cursor: pointer;
  }

  .settings-select {
    display: block;
    width: 100%;
    max-width: 320px;
    height: 36px;
    padding: 0 0.75rem;
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
    font-size: 0.875rem;
    cursor: pointer;
    transition: border-color 150ms;
  }

  .settings-select:focus-visible {
    outline: none;
    border-color: hsl(var(--ring));
    box-shadow: 0 0 0 2px hsla(var(--ring) / 0.3);
  }

  .settings-input {
    display: block;
    width: 100%;
    max-width: 320px;
    height: 36px;
    padding: 0 0.75rem;
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
    font-size: 0.875rem;
    transition: border-color 150ms;
  }

  .settings-input:focus-visible {
    outline: none;
    border-color: hsl(var(--ring));
    box-shadow: 0 0 0 2px hsla(var(--ring) / 0.3);
  }

  .settings-checkbox-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .settings-checkbox {
    width: 1rem;
    height: 1rem;
    accent-color: hsl(var(--primary));
    cursor: pointer;
  }

  .color-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .color-swatch {
    width: 32px;
    height: 32px;
    border-radius: 0.375rem;
    border: 2px solid transparent;
    cursor: pointer;
    transition: border-color 150ms, transform 150ms;
  }

  .color-swatch:hover {
    transform: scale(1.1);
  }

  .color-swatch:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
  }

  .color-swatch.selected {
    border-color: hsl(var(--foreground));
    box-shadow: 0 0 0 2px hsl(var(--background)), 0 0 0 3px hsl(var(--foreground));
  }

  .color-input-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .settings-color-input {
    width: 48px;
    height: 36px;
    padding: 2px;
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    background: transparent;
    cursor: pointer;
  }

  .settings-color-input:focus-visible {
    outline: none;
    border-color: hsl(var(--ring));
    box-shadow: 0 0 0 2px hsla(var(--ring) / 0.3);
  }

  .color-value {
    font-size: 0.8125rem;
    color: hsl(var(--muted-foreground));
    font-family: var(--font-mono);
  }
</style>
