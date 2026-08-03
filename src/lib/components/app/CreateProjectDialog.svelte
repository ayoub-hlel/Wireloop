<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import CircuitSettingsForm from "./CircuitSettingsForm.svelte";
  import { goto } from "$app/navigation";
  import { getApiClient } from "../../../stores/api.client";
  import settingsStore from "../../../stores/settings.store";
  import projectStore from "../../../stores/project.store";
  import { onErrorMessage } from "../../../help/alerts";
  import { defaultSetting } from "../../../types/arduino-sim";
  import type { Settings } from "../../../types/arduino-sim";

  let { open = $bindable(false) }: { open: boolean } = $props();

  let name = $state("");
  let settings: Settings = $state({ ...(defaultSetting as Settings) });
  let creating = $state(false);

  // Start from the user's current defaults each time the dialog opens
  $effect(() => {
    if (!open) return;
    name = "";
    const unsub = settingsStore.subscribe((s) => {
      settings = { ...(s as unknown as Settings) };
    });
    unsub();
  });

  async function create() {
    if (!name.trim() || creating) return;
    creating = true;
    try {
      // ponytail: circuit settings are user-level defaults (settings table),
      // so creating a project = create row + persist chosen defaults.
      const { projectId, project } = (await getApiClient().mutation("projects:createProject", {
        name: name.trim(),
        workspace: "<xml></xml>",
        boardType: settings.boardType,
      })) as { projectId: string; project: unknown };
      settingsStore.set(settings as never);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      projectStore.set({ project: project as any, projectId });
      open = false;
      await goto(`/studio?projectid=${projectId}`);
    } catch (e) {
      onErrorMessage("Could not create project.", e);
    } finally {
      creating = false;
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-xl">
    <Dialog.Header>
      <Dialog.Title>New project</Dialog.Title>
    </Dialog.Header>

    <form class="create-form" onsubmit={(e) => { e.preventDefault(); create(); }}>
      <div class="form-group">
        <label for="new-project-name">Name</label>
        <Input bind:value={name} id="new-project-name" placeholder="My Arduino project" />
      </div>

      <CircuitSettingsForm bind:settings />

      <div class="create-actions">
        <Button type="submit" disabled={!name.trim() || creating}>
          {creating ? "Creating…" : "Create project"}
        </Button>
      </div>
    </form>
  </Dialog.Content>
</Dialog.Root>

<style>
  .create-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 60vh;
    overflow-y: auto;
  }

  .create-actions {
    display: flex;
    justify-content: flex-end;
  }
</style>
