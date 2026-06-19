<script lang="ts">
  import { defaultSetting } from "../../../firebase/model";
  import type { Settings } from "../../../firebase/model";
  import { fbSaveSettings } from "../../../firebase/db";
  import authStore from "../../../stores/auth.store";
  import settingsStore from "../../../stores/settings.store";
  import FlashMessage from "../../../components/wireloop/ui/FlashMessage.svelte";
  import isEqual from "lodash/isEqual";
  import { onErrorMessage } from "../../../help/alerts";
  import { MicroControllerType } from "../../../core/microcontroller/microcontroller";
  import { ledColors } from "../../../blocks/led/virtual-circuit";
  let uid: string;

  let settings: Settings;

  let showMessage = false;

  let previousSettings: Settings | null = null;

  settingsStore.subscribe((newSettings) => {
    settings = newSettings as unknown as Settings;
  });

  async function onSaveSettings() {
    await saveSettings(settings);
  }

  async function onReset() {
    await saveSettings(defaultSetting as Settings);
  }

  function changeLedColor(e: Event) {
    settings.ledColor = (e.target as HTMLElement).getAttribute("data-color") || "";
  }

  async function saveSettings(settings: Settings) {
    if (isEqual(previousSettings, settings)) {
      showMessage = true;
      console.log("blocked saved", previousSettings, settings);
      return;
    }

    if (uid) {
      try {
        await fbSaveSettings(uid, settings as any);
        console.log("saved settings", settings);
      } catch (e: any) {
        onErrorMessage("Please try again in 5 minutes.", e);
      }
    }

    settingsStore.set(settings as any);
    previousSettings = { ...settings };
    showMessage = true;
  }

  authStore.subscribe((auth) => {
    uid = auth.uid ?? '';
  });
</script>

{#if settings}
  <div class="row">
    <div class="col">
      <div class="form-group">
        <label for="boardType">MicroController</label>
        <select bind:value={settings.boardType} id="boardType" class="form-control">
          <option value={MicroControllerType.ARDUINO_UNO}>Arduino Uno</option>
          <option value={MicroControllerType.ARDUINO_MEGA}>Arduino Mega</option>
        </select>
      </div>
    </div>
  </div>

  <div class="row">
    <div class="col">
      <div class="form-group">
        <label for="max-time-per-move">Milliseconds Per Move</label>
        <input
          bind:value={settings.maxTimePerMove}
          type="number"
          id="max-time-per-move"
          class="form-control"
        />
      </div>
    </div>
  </div>

  <div class="row">
    <div class="col">
      <div class="form-check">
        <input
          type="checkbox"
          bind:checked={settings.customLedColor}
          id="custom-led-color"
          class="form-check-input"
        />
        <label for="custom-led-color" class="form-check-label">Custom Led Color</label>
      </div>
    </div>
  </div>

  <div class="row">
    <div class="col">
      {#if settings.customLedColor}
        <div class="row">
          <div class="col color-container">
            {#each ledColors as color (color)}
              <button
                type="button"
                class="color {color}"
                on:click={changeLedColor}
                style="background-color: {color};"
                data-color={color}
                class:selected={settings.ledColor == color}
                id={color}
                aria-label="Select {color} LED color"
                aria-pressed={settings.ledColor == color}
              ></button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>

  <div class="row">
    <div class="col">
      <div class="form-group">
        <label for="touch-skin-color">Touch sensor's finger color</label>
        <input
          bind:value={settings.touchSkinColor}
          type="color"
          id="touch-skin-color"
          class="form-control"
        />
      </div>
    </div>
  </div>

  <div class="row">
    <div class="col">
      <div class="form-group">
        <label for="background-color">Arduino's Background Color</label>
        <input
          bind:value={settings.backgroundColor}
          type="color"
          id="background-color"
          class="form-control"
        />
      </div>
    </div>
  </div>

  <div class="row">
    <div class="col">
      <button type="button" class="btn btn-success me-2" on:click={onSaveSettings}>
        Save
      </button>
      <button type="button" class="btn btn-warning" on:click={onReset}>Reset</button>
    </div>
  </div>
{/if}

<FlashMessage bind:show={showMessage} message="Successfully Save." />

<svelte:head>
  <title>Wireloop - Virtual Circuit</title>
</svelte:head>

<style>
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
