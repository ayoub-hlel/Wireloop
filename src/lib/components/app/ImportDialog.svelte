<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { goto } from "$app/navigation";
  import projectStore from "../../../stores/project.store";
  import { onConfirm, onErrorMessage } from "../../../help/alerts";

  let { open = $bindable(false) }: { open: boolean } = $props();

  let dragging = $state(false);

  async function importFile(file: File | undefined) {
    if (!file) return;
    if (!(await onConfirm(`Do you want to load ${file.name}, this will erase everything that you have done.`))) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const target = evt.target;
      if (!target || target.readyState != 2) return;
      if (target.error) {
        onErrorMessage("Please upload a valid arduino workflow builder file.", target.error);
        return;
      }
      projectStore.set({ project: null, projectId: null });
      localStorage.setItem("reload_once_workspace", target.result as string);
      open = false;
      await goto("/studio");
    };
    reader.readAsText(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    importFile(e.dataTransfer?.files?.[0]);
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-xl">
    <Dialog.Header>
      <Dialog.Title>Import</Dialog.Title>
    </Dialog.Header>

    <div
      class="import-dropzone"
      class:import-dropzone-active={dragging}
      role="button"
      tabindex="0"
      ondragover={(e) => { e.preventDefault(); dragging = true; }}
      ondragleave={() => (dragging = false)}
      ondrop={onDrop}
      onclick={() => document.getElementById("import-file-input")?.click()}
      onkeydown={(e) => e.key === "Enter" && document.getElementById("import-file-input")?.click()}
    >
      <div class="import-text">
        <span class="import-title">Bring your work into Wireloop</span>
        <span class="import-subtitle">Import Arduino Workflow Builder project files (.xml).</span>
      </div>
      <Button onclick={(e) => { e.stopPropagation(); document.getElementById("import-file-input")?.click(); }}>
        Import from computer
      </Button>
      <input
        id="import-file-input"
        type="file"
        accept=".xml"
        class="import-file-input"
        onchange={(e) => importFile((e.target as HTMLInputElement).files?.[0])}
      />
    </div>
  </Dialog.Content>
</Dialog.Root>

<style>
  .import-dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    min-height: 316px;
    padding: 1rem;
    border: 1px dashed hsl(var(--border));
    border-radius: 0.375rem;
    cursor: pointer;
  }

  .import-dropzone-active {
    border-color: hsl(var(--ring));
    background-color: hsl(var(--ring) / 0.06);
  }

  .import-dropzone:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
  }

  .import-text {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.25rem;
    line-height: 24px;
  }

  .import-title {
    font-size: 1rem;
    font-weight: 600;
    color: hsl(var(--foreground));
  }

  .import-subtitle {
    width: 66.6667%;
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
  }

  .import-file-input {
    display: none;
  }
</style>
