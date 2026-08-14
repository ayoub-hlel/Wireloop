<script lang="ts">
  import { onDestroy } from 'svelte';
  import authStore from "../../../stores/auth.store";
  import projectStore from "../../../stores/project.store";
  import { getApiClient } from "../../../stores/api.client";
import { onErrorMessage, onSuccess } from "../../../help/alerts";
import { workspaceToXML } from "../../../core/blockly/helpers/workspace.helper";
import codeStore from "../../../stores/code.store";
import { saveAs } from "file-saver";
import { Separator } from "$lib/components/ui/separator/index.js";
import { Button } from "$lib/components/ui/button/index.js";
import { Input } from "$lib/components/ui/input/index.js";
import { Label } from "$lib/components/ui/label/index.js";
import type { Project } from "../../../types/models";

  let projectName = $state("");
  let projectDescription = $state("");
  let canSave = $state(true);
  let code = $state("");
  let projectId = $state("");

  // Sharing (personal projects only)
  let collaborators = $state<Array<{ userId: string; name: string; role: string }>>([]);
  let shareEmail = $state("");
  let shareRole = $state<'view' | 'edit'>('view');

  const unSubProjectStore = projectStore.subscribe((projectInfo) => {
    if (projectInfo.project) {
      projectName = projectInfo.project.name;
      projectDescription = projectInfo.project.description ?? '';
      projectId = projectInfo.projectId ?? '';
      loadCollaborators();
    }
  });

  const unsubCodeStore = codeStore.subscribe((newCode) => { code = newCode.code; });

  onDestroy(() => {
    unSubProjectStore();
    unsubCodeStore();
  });

  async function loadCollaborators() {
    if (!projectId) return;
    try {
      const proj = $projectStore.project as Record<string, unknown> | null;
      if (proj?.orgId) { collaborators = []; return; } // org projects: sharing disabled
      // ponytail: shared projects list is fetched via a lightweight join; for now show owner-only.
      collaborators = [];
    } catch { /* non-fatal */ }
  }

  async function saveFile() {
    if (!canSave || !projectId) return;
    canSave = false;
    try {
      const projectToSave = { ...($projectStore.project as object), name: projectName, description: projectDescription };
      await getApiClient().mutation('projects:updateProject', { projectId, name: projectName, description: projectDescription });
      const xml = workspaceToXML() || '';
      await getApiClient().mutation('projects:saveProjectFile', { projectId, userId: $authStore.uid, content: xml, filename: `${projectId}.xml` });
      projectStore.set({ projectId, project: projectToSave as unknown as Project });
      onSuccess("Project saved");
      canSave = true;
    } catch {
      onErrorMessage("Please try again");
      canSave = true;
    }
  }

  async function share() {
    if (!shareEmail.trim()) return;
    try {
      await getApiClient().mutation('project:share', { projectId, email: shareEmail.trim(), role: shareRole });
      onSuccess(`Invited ${shareEmail}`);
      shareEmail = '';
      loadCollaborators();
    } catch (e) { onErrorMessage("Could not share", e); }
  }

  async function unshare(userId: string) {
    try {
      await getApiClient().mutation('project:unshare', { projectId, userId });
      collaborators = collaborators.filter(c => c.userId !== userId);
    } catch (e) { onErrorMessage("Could not remove", e); }
  }

  function downloadCode() {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    saveAs(blob, "arduino_workflow_builder_code.ino");
  }

  function downloadProject() {
    const blob = new Blob([workspaceToXML() || ''], { type: "application/xml;charset=utf-8" });
    saveAs(blob, "arduino_workflow_builder_project.xml");
  }

  // ponytail: models.ts Project is incomplete (no orgId, different boardType enum);
  // the DB row has more fields, so cast for settings access.
  let project = $derived($projectStore.project as Record<string, unknown> | null);
  let isPersonal = $derived(!project?.orgId);
</script>

<svelte:head>
  <title>Wireloop - Project Settings</title>
</svelte:head>

<div class="settings-page">
  <header class="settings-header">
    <h1 class="settings-title">Project Settings</h1>
  </header>

  <div class="settings-content">
    <!-- General -->
    <section class="settings-section">
      <h3 class="settings-heading">General</h3>
      <div class="settings-field">
        <Label for="project-name">Name</Label>
        <Input id="project-name" bind:value={projectName} />
      </div>
      <div class="settings-field">
        <Label for="project-desc">Description</Label>
        <Input id="project-desc" bind:value={projectDescription} />
      </div>
      <div class="settings-actions">
        <Button size="sm" disabled={!canSave || !projectId} onclick={saveFile}>Save</Button>
      </div>
    </section>

    <Separator />

    <!-- Circuit settings (absorbs the old circuit-settings route) -->
    <section class="settings-section">
      <h3 class="settings-heading">Circuit</h3>
      {#if project}
        <div class="settings-field">
          <Label for="board-type">Board Type</Label>
          <select id="board-type" bind:value={project.boardType} class="share-role-select">
            <option value="uno">Arduino Uno</option>
            <option value="nano">Arduino Nano</option>
            <option value="mega">Arduino Mega</option>
          </select>
        </div>
      {:else}
        <p class="muted">Load a project to edit circuit settings.</p>
      {/if}
    </section>

    <Separator />

    <!-- Sharing (personal only) -->
    {#if isPersonal}
      <section class="settings-section">
        <h3 class="settings-heading">Sharing</h3>
        {#if collaborators.length > 0}
          <div class="share-list">
            {#each collaborators as c (c.userId)}
              <div class="share-row">
                <span class="share-name">{c.name}</span>
                <span class="share-role">{c.role}</span>
                <button class="share-remove" onclick={() => unshare(c.userId)}>Remove</button>
              </div>
            {/each}
          </div>
        {/if}
        <div class="share-add">
          <Input bind:value={shareEmail} placeholder="colleague@example.com" />
          <select bind:value={shareRole} class="share-role-select">
            <option value="view">Viewer</option>
            <option value="edit">Editor</option>
          </select>
          <Button size="sm" onclick={share}>Invite</Button>
        </div>
      </section>
      <Separator />
    {/if}

    <!-- Export -->
    <section class="settings-section">
      <h3 class="settings-heading">Export</h3>
      <div class="settings-actions">
        <Button size="sm" variant="ghost" onclick={downloadProject}>Download project</Button>
        <Button size="sm" variant="ghost" onclick={downloadCode}>Download code</Button>
      </div>
    </section>
  </div>
</div>

<style>
  .settings-page { max-width: 720px; margin: 0 auto; padding: 2rem 1.5rem; }
  .settings-header { margin-bottom: 1.5rem; }
  .settings-title { font-size: 1.5rem; font-weight: 600; margin: 0; color: hsl(var(--foreground)); }
  .settings-content { display: flex; flex-direction: column; }
  .settings-section { padding: 1.25rem 0; }
  .settings-heading { font-size: 0.875rem; font-weight: 600; margin: 0 0 0.75rem; color: hsl(var(--foreground)); }
  .settings-field { margin-bottom: 0.75rem; }
  .settings-field :global(label) { display: block; font-size: 0.8125rem; margin-bottom: 0.25rem; color: hsl(var(--muted-foreground)); }
  .settings-actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
  .share-list { display: flex; flex-direction: column; gap: 0.375rem; margin-bottom: 0.75rem; }
  .share-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0.5rem; background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: var(--radius); }
  .share-name { flex: 1; font-size: 0.8125rem; }
  .share-role { font-size: 0.75rem; color: hsl(var(--muted-foreground)); }
  .share-remove { font-size: 0.75rem; color: hsl(var(--destructive)); background: none; border: none; cursor: pointer; }
  .share-add { display: flex; gap: 0.5rem; align-items: center; }
  .share-role-select { padding: 0.375rem 0.5rem; border: 1px solid hsl(var(--border)); border-radius: var(--radius); font-size: 0.8125rem; background: hsl(var(--background)); }
</style>
