<script lang="ts">
  import { defaultSetting } from "../../../types/arduino-sim";
  import type { Settings } from "../../../types/arduino-sim";
  import type { Settings as UserSettings } from "../../../types/models";
  import { getApiClient } from "../../../stores/api.client";
  import { settingsSyncPayload } from "../../../stores/settings-sync";
  import authStore from "../../../stores/auth.store";
  import settingsStore from "../../../stores/settings.store";
  import FlashMessage from "../../../components/wireloop/ui/FlashMessage.svelte";
  import CircuitSettingsForm from "$lib/components/app/CircuitSettingsForm.svelte";
  import isEqual from "lodash/isEqual";
  import { onErrorMessage } from "../../../help/alerts";
  let uid: string = $state('');

  let settings: Settings = $state(defaultSetting as Settings);

  let showMessage = $state(false);

  let previousSettings: Settings | null = $state(null);

  settingsStore.subscribe((newSettings) => {
    settings = newSettings as unknown as Settings;
  });

  async function onSaveSettings() {
    await saveSettings(settings);
  }

  async function onReset() {
    await saveSettings(defaultSetting as Settings);
  }

  async function saveSettings(settings: Settings) {
    if (isEqual(previousSettings, settings)) {
      showMessage = true;
      console.log("blocked saved", previousSettings, settings);
      return;
    }

    if (uid) {
      try {
        // ponytail: settings is typed as arduino-sim visual Settings, but the
        // subscription below reassigns it from the user-preference store (the
        // route conflates the two types). users:updateUserSettings is a
        // .strict() schema — only the 5 keys from settingsSyncPayload are
        // accepted; codeFont + visual fields would 400. See stores/settings-sync.ts.
        await getApiClient().mutation('users:updateUserSettings',
          settingsSyncPayload(settings as unknown as Partial<UserSettings>));
        console.log("saved settings", settings);
      } catch (e: unknown) {
        onErrorMessage("Please try again in 5 minutes.", e);
      }
    }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
    settingsStore.set(settings as any);
    previousSettings = { ...settings };
    showMessage = true;
  }

  authStore.subscribe((auth) => {
    uid = auth.uid ?? '';
  });
</script>

{#if settings}
  <CircuitSettingsForm bind:settings />

  <div class="row">
    <div class="col">
      <button type="button" class="btn btn-success me-2" onclick={onSaveSettings}>
        Save
      </button>
      <button type="button" class="btn btn-warning" onclick={onReset}>Reset</button>
    </div>
  </div>
{/if}

<FlashMessage bind:show={showMessage} message="Successfully Save." />

<svelte:head>
  <title>Wireloop - Circuit Settings</title>
</svelte:head>
