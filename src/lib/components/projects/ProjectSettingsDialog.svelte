<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import * as Tabs from '$lib/components/ui/tabs/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Textarea } from '$lib/components/ui/textarea/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Separator } from '$lib/components/ui/separator/index.js';
  import { getApiClient } from '../../../stores/api.client';
  import { onErrorMessage, onSuccess } from '../../../help/alerts';

  type Collaborator = { userId: string; name: string; email: string; role: 'view' | 'edit' };

  let { open = $bindable(false) }: { open: boolean } = $props();
  let projectId = $state('');
  let projectName = $state('');
  let projectDescription = $state('');
  let boardType = $state<'uno' | 'nano' | 'mega'>('uno');
  let isPublic = $state(false);
  let isPersonal = $state(true);
  let saving = $state(false);

  let collaborators = $state<Collaborator[]>([]);
  let shareEmail = $state('');
  let shareRole = $state<'view' | 'edit'>('view');

  export function load(project: { id: string; name: string; description?: string; boardType?: string; isPublic?: boolean; orgId?: string | null }) {
    projectId = project.id;
    projectName = project.name;
    projectDescription = project.description ?? '';
    boardType = (project.boardType as 'uno' | 'nano' | 'mega') ?? 'uno';
    isPublic = project.isPublic ?? false;
    isPersonal = !project.orgId;
    open = true;
    if (isPersonal) loadCollaborators();
  }

  async function loadCollaborators() {
    if (!projectId) return;
    try {
      const res = (await getApiClient().query('projects:getSharedMembers', { projectId })) as Collaborator[];
      collaborators = res ?? [];
    } catch { collaborators = []; }
  }

  async function saveGeneral() {
    if (!projectId) return;
    saving = true;
    try {
      await getApiClient().mutation('projects:updateProject', {
        projectId,
        name: projectName,
        description: projectDescription,
        boardType,
        isPublic: isPersonal ? isPublic : false,
      });
      onSuccess('Project settings saved');
    } catch (e) { onErrorMessage('Could not save settings', e); }
    finally { saving = false; }
  }

  async function share() {
    if (!shareEmail.trim()) return;
    try {
      await getApiClient().mutation('project:share', { projectId, email: shareEmail.trim(), role: shareRole });
      onSuccess(`Invited ${shareEmail}`);
      shareEmail = '';
      shareRole = 'view';
      loadCollaborators();
    } catch (e) { onErrorMessage('Could not share', e); }
  }

  async function removeCollaborator(userId: string) {
    try {
      await getApiClient().mutation('project:unshare', { projectId, userId });
      collaborators = collaborators.filter(c => c.userId !== userId);
    } catch (e) { onErrorMessage('Could not remove', e); }
  }

  async function changeRole(userId: string, role: 'view' | 'edit') {
    try {
      await getApiClient().mutation('project:changeShareRole', { projectId, userId, role });
      collaborators = collaborators.map(c => c.userId === userId ? { ...c, role } : c);
    } catch (e) { onErrorMessage('Could not change role', e); }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="settings-dialog">
    <Dialog.Header>
      <Dialog.Title>Project Settings</Dialog.Title>
    </Dialog.Header>

    <Tabs.Root value="general" class="settings-tabs">
      <Tabs.List class="settings-tabs-list">
        <Tabs.Trigger value="general">General</Tabs.Trigger>
        <Tabs.Trigger value="circuit">Circuit</Tabs.Trigger>
        {#if isPersonal}
          <Tabs.Trigger value="sharing">Sharing</Tabs.Trigger>
        {/if}
      </Tabs.List>

      <!-- General Tab -->
      <Tabs.Content value="general" class="settings-tab-content">
        <div class="settings-field">
          <Label for="ps-name">Project name</Label>
          <Input id="ps-name" bind:value={projectName} placeholder="My Arduino project" />
        </div>
        <div class="settings-field">
          <Label for="ps-desc">Description</Label>
          <Textarea id="ps-desc" bind:value={projectDescription} rows={3} placeholder="Optional description" />
        </div>
        {#if isPersonal}
          <div class="settings-field">
            <Label for="ps-visibility">Visibility</Label>
            <div class="toggle-row">
              <input type="checkbox" id="ps-visibility" bind:checked={isPublic} />
              <span class="toggle-label">Public (appears in Community)</span>
            </div>
          </div>
        {/if}
        <div class="settings-actions">
          <Button size="sm" disabled={saving || !projectName.trim()} onclick={saveGeneral}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </Tabs.Content>

      <!-- Circuit Tab -->
      <Tabs.Content value="circuit" class="settings-tab-content">
        <div class="settings-field">
          <Label for="ps-board">Board Type</Label>
          <select id="ps-board" bind:value={boardType} class="settings-select">
            <option value="uno">Arduino Uno</option>
            <option value="nano">Arduino Nano</option>
            <option value="mega">Arduino Mega</option>
          </select>
        </div>
        <div class="settings-actions">
          <Button size="sm" disabled={saving} onclick={saveGeneral}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </Tabs.Content>

      <!-- Sharing Tab (personal only) -->
      {#if isPersonal}
        <Tabs.Content value="sharing" class="settings-tab-content">
          {#if collaborators.length > 0}
            <div class="share-list">
              {#each collaborators as c (c.userId)}
                <div class="share-row">
                  <div class="share-info">
                    <span class="share-name">{c.name}</span>
                    <span class="share-email">{c.email}</span>
                  </div>
                  <select class="share-role-select" value={c.role} onchange={(e) => changeRole(c.userId, (e.target as HTMLSelectElement).value as 'view' | 'edit')}>
                    <option value="view">Viewer</option>
                    <option value="edit">Editor</option>
                  </select>
                  <button class="share-remove" onclick={() => removeCollaborator(c.userId)} aria-label="Remove {c.name}">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="M5.152 5.152a.5.5 0 0 1 .707 0L12 11.293l6.141-6.141a.5.5 0 1 1 .707.707L12.707 12l6.141 6.141a.5.5 0 1 1-.707.707L12 12.707l-6.141 6.141a.5.5 0 1 1-.707-.707L11.293 12 5.152 5.859a.5.5 0 0 1 0-.707" clip-rule="evenodd"/></svg>
                  </button>
                </div>
              {/each}
            </div>
            <Separator />
          {/if}
          <div class="share-add">
            <Input bind:value={shareEmail} placeholder="colleague@example.com" class="share-email-input" />
            <select bind:value={shareRole} class="share-role-select">
              <option value="view">Viewer</option>
              <option value="edit">Editor</option>
            </select>
            <Button size="sm" onclick={share}>Invite</Button>
          </div>
        </Tabs.Content>
      {/if}
    </Tabs.Root>
  </Dialog.Content>
</Dialog.Root>

<style>
  .settings-dialog { max-width: 540px; }
  .settings-tabs { display: flex; flex-direction: column; }
  .settings-tabs-list { display: flex; gap: 0.25rem; margin-bottom: 1.25rem; }
  .settings-tab-content { display: flex; flex-direction: column; gap: 1rem; }
  .settings-field { display: flex; flex-direction: column; gap: 0.375rem; }
  .settings-field :global(label) { font-size: 0.8125rem; color: hsl(var(--muted-foreground)); }
  .settings-select {
    height: 36px;
    padding: 0 0.75rem;
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    font-size: 0.8125rem;
    background: hsl(var(--background));
    color: hsl(var(--foreground));
    cursor: pointer;
    transition: border-color 150ms;
  }
  .settings-select:focus-visible {
    outline: none;
    border-color: hsl(var(--ring));
    box-shadow: 0 0 0 2px hsla(var(--ring) / 0.3);
  }
  .settings-actions { display: flex; justify-content: flex-end; margin-top: 0.75rem; }
  .toggle-row { display: flex; align-items: center; gap: 0.5rem; }
  .toggle-row input[type="checkbox"] { width: 1rem; height: 1rem; accent-color: hsl(var(--primary)); cursor: pointer; }
  .toggle-label { font-size: 0.8125rem; color: hsl(var(--foreground)); cursor: pointer; }
  .share-list { display: flex; flex-direction: column; gap: 0.375rem; }
  .share-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.625rem; background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: var(--radius); transition: border-color 150ms; }
  .share-row:hover { border-color: hsl(var(--border-strong)); }
  .share-info { flex: 1; display: flex; flex-direction: column; min-width: 0; gap: 0.125rem; }
  .share-name { font-size: 0.875rem; color: hsl(var(--foreground)); font-weight: 500; }
  .share-email { font-size: 0.75rem; color: hsl(var(--muted-foreground)); }
  .share-role-select {
    height: 28px;
    padding: 0 0.375rem;
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    font-size: 0.75rem;
    background: hsl(var(--background));
    color: hsl(var(--foreground));
    cursor: pointer;
    transition: border-color 150ms;
  }
  .share-role-select:focus-visible {
    outline: none;
    border-color: hsl(var(--ring));
  }
  .share-remove { display: flex; align-items: center; justify-content: center; width: 1.75rem; height: 1.75rem; border: none; border-radius: var(--radius); background: transparent; color: hsl(var(--muted-foreground)); cursor: pointer; transition: color 150ms, background 150ms; }
  .share-remove:hover { background: hsla(var(--destructive) / 0.1); color: hsl(var(--destructive)); }
  .share-remove:focus-visible { outline: 2px solid hsl(var(--ring)); outline-offset: 2px; }
  .share-add { display: flex; gap: 0.5rem; align-items: center; }
  .share-email-input { flex: 1; }
</style>
