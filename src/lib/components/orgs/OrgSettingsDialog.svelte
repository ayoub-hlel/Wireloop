<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import * as Tabs from '$lib/components/ui/tabs/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Separator } from '$lib/components/ui/separator/index.js';
  import { getApiClient } from '../../../stores/api.client';
  import { onErrorMessage, onSuccess } from '../../../help/alerts';

  type Member = { userId: string; name: string; email: string; role: string };

  let { open = $bindable(false) }: { open: boolean } = $props();
  let orgId = $state('');
  let orgName = $state('');
  let orgSlug = $state('');
  let orgDescription = $state('');
  let isOwner = $state(false);
  let saving = $state(false);

  let members = $state<Member[]>([]);
  let inviteEmail = $state('');
  let inviteRole = $state<'admin' | 'user' | 'viewer'>('user');

  export function load(org: { id: string; name: string; slug: string; description?: string | null }, role: string) {
    orgId = org.id;
    orgName = org.name;
    orgSlug = org.slug;
    orgDescription = org.description ?? '';
    isOwner = role === 'owner';
    open = true;
    loadMembers();
  }

  async function loadMembers() {
    if (!orgId) return;
    try {
      const res = (await getApiClient().query('org:getMembers', { orgId })) as Member[];
      members = res ?? [];
    } catch { members = []; }
  }

  async function saveInfo() {
    if (!orgId) return;
    saving = true;
    try {
      await getApiClient().mutation('org:update', { orgId, name: orgName, slug: orgSlug, description: orgDescription });
      onSuccess('Organization updated');
    } catch (e) { onErrorMessage('Could not update organization', e); }
    finally { saving = false; }
  }

  async function invite() {
    if (!inviteEmail.trim()) return;
    try {
      await getApiClient().mutation('org:invite', { orgId, email: inviteEmail.trim(), role: inviteRole });
      onSuccess(`Invited ${inviteEmail}`);
      inviteEmail = '';
      inviteRole = 'user';
      loadMembers();
    } catch (e) { onErrorMessage('Could not invite', e); }
  }

  async function changeRole(userId: string, role: string) {
    try {
      await getApiClient().mutation('org:changeRole', { orgId, userId, role });
      members = members.map(m => m.userId === userId ? { ...m, role } : m);
    } catch (e) { onErrorMessage('Could not change role', e); }
  }

  async function removeMember(userId: string) {
    try {
      await getApiClient().mutation('org:removeMember', { orgId, userId });
      members = members.filter(m => m.userId !== userId);
    } catch (e) { onErrorMessage('Could not remove member', e); }
  }

  async function leaveOrg() {
    try {
      await getApiClient().mutation('org:leave', { orgId });
      open = false;
    } catch (e) { onErrorMessage('Could not leave organization', e); }
  }

  async function deleteOrg() {
    try {
      await getApiClient().mutation('org:delete', { orgId });
      open = false;
    } catch (e) { onErrorMessage('Could not delete organization', e); }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="settings-dialog">
    <Dialog.Header>
      <Dialog.Title>Organization Settings</Dialog.Title>
    </Dialog.Header>

    <Tabs.Root value="info" class="settings-tabs">
      <Tabs.List class="settings-tabs-list">
        <Tabs.Trigger value="info">General</Tabs.Trigger>
        <Tabs.Trigger value="members">Members</Tabs.Trigger>
      </Tabs.List>

      <!-- General Tab -->
      <Tabs.Content value="info" class="settings-tab-content">
        <div class="settings-field">
          <Label for="org-name">Organization name</Label>
          <Input id="org-name" bind:value={orgName} placeholder="My Organization" />
        </div>
        <div class="settings-field">
          <Label for="org-slug">Slug</Label>
          <Input id="org-slug" bind:value={orgSlug} placeholder="my-org" />
        </div>
        <div class="settings-field">
          <Label for="org-desc">Description</Label>
          <Input id="org-desc" bind:value={orgDescription} placeholder="Optional" />
        </div>
        {#if isOwner}
          <div class="settings-actions">
            <Button size="sm" disabled={saving || !orgName.trim()} onclick={saveInfo}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        {/if}
      </Tabs.Content>

      <!-- Members Tab -->
      <Tabs.Content value="members" class="settings-tab-content">
        {#if isOwner || members.find(m => m.userId === '')}
          <div class="share-add">
            <Input bind:value={inviteEmail} placeholder="colleague@example.com" class="share-email-input" />
            <select bind:value={inviteRole} class="share-role-select">
              <option value="admin">Admin</option>
              <option value="user">User</option>
              <option value="viewer">Viewer</option>
            </select>
            <Button size="sm" onclick={invite}>Invite</Button>
          </div>
          <Separator />
        {/if}
        <div class="share-list">
          {#each members as m (m.userId)}
            <div class="share-row">
              <div class="share-info">
                <span class="share-name">{m.name}</span>
                <span class="share-email">{m.email}</span>
              </div>
              {#if isOwner && m.role !== 'owner'}
                <select class="share-role-select" value={m.role} onchange={(e) => changeRole(m.userId, (e.target as HTMLSelectElement).value)}>
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button class="share-remove" onclick={() => removeMember(m.userId)} aria-label="Remove {m.name}">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="M5.152 5.152a.5.5 0 0 1 .707 0L12 11.293l6.141-6.141a.5.5 0 1 1 .707.707L12.707 12l6.141 6.141a.5.5 0 1 1-.707.707L12 12.707l-6.141 6.141a.5.5 0 1 1-.707-.707L11.293 12 5.152 5.859a.5.5 0 0 1 0-.707" clip-rule="evenodd"/></svg>
                </button>
              {:else if m.role === 'owner'}
                <span class="owner-badge">Owner</span>
              {/if}
            </div>
          {/each}
        </div>
        {#if !isOwner}
          <Separator />
          <div class="settings-actions">
            <Button size="sm" variant="destructive" onclick={leaveOrg}>Leave organization</Button>
          </div>
        {:else}
          <Separator />
          <div class="settings-actions">
            <Button size="sm" variant="destructive" onclick={deleteOrg}>Delete organization</Button>
          </div>
        {/if}
      </Tabs.Content>
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
  .settings-actions { display: flex; justify-content: flex-end; margin-top: 0.75rem; gap: 0.5rem; }
  .share-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .share-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: var(--radius); transition: border-color 150ms; }
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
  .owner-badge { font-size: 0.625rem; font-weight: 600; color: hsl(var(--muted-foreground)); padding: 0.125rem 0.375rem; border: 1px solid hsl(var(--border)); border-radius: 999px; text-transform: uppercase; letter-spacing: 0.04em; }
</style>
