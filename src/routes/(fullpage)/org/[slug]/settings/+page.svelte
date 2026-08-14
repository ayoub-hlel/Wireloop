<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { getApiClient } from '../../../../../stores/api.client';
  import { onErrorMessage, onSuccess } from '../../../../../help/alerts';
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import { authClient } from '$lib/client/auth-client';

  let orgId = $state("");
  let orgName = $state("");
  let orgSlug = $state("");
  let orgDescription = $state("");
  let members = $state<Array<{ userId: string; role: string; name: string; username: string; email: string }>>([]);
  let myRole = $state<string | null>(null);
  let loading = $state(true);
  let saving = $state(false);

  // Invite
  let inviteEmail = $state("");
  let inviteRole = $state<'admin' | 'user' | 'viewer'>('user');

  // Transfer
  let transferUserId = $state("");
  let confirmDelete = $state("");

  onMount(async () => {
    const slug = $page.params.slug;
    try {
      const orgs = (await getApiClient().query('org:getUserOrgs', {})) as Array<{ id: string; slug: string; name: string; description: string | null; ownerId: string }>;
      const org = orgs.find(o => o.slug === slug);
      if (!org) return;
      orgId = org.id;
      orgName = org.name;
      orgSlug = org.slug;
      orgDescription = org.description ?? '';
      await loadMembers();
    } catch { /* non-fatal */ }
    finally { loading = false; }
  });

  async function loadMembers() {
    const rows = (await getApiClient().query('org:getMembers', { orgId })) as Array<{ userId: string; role: string; name: string; username: string; email: string }>;
    members = rows;
    const { data: session } = await authClient.getSession();
    const me = session?.user?.id;
    const mine = members.find(m => m.userId === me);
    // owner may not be in org_members rows — check org ownerId
    const org = (await getApiClient().query('org:getUserOrgs', {}) as Array<{ id: string; ownerId: string }>).find(o => o.id === orgId);
    if (org?.ownerId === me) myRole = 'owner';
    else myRole = mine?.role ?? null;
  }

  async function saveGeneral() {
    if (myRole !== 'owner') return;
    saving = true;
    try {
      await getApiClient().mutation('org:update', { orgId, name: orgName, slug: orgSlug, description: orgDescription });
      onSuccess("Organization updated");
    } catch (e) { onErrorMessage("Could not update", e); }
    finally { saving = false; }
  }

  async function invite() {
    if (!inviteEmail.trim()) return;
    try {
      await getApiClient().mutation('org:invite', { orgId, email: inviteEmail.trim(), role: inviteRole });
      onSuccess(`Invited ${inviteEmail}`);
      inviteEmail = '';
      await loadMembers();
    } catch (e) { onErrorMessage("Could not invite", e); }
  }

  async function changeRole(userId: string, role: string) {
    try {
      await getApiClient().mutation('org:changeRole', { orgId, userId, role });
      await loadMembers();
    } catch (e) { onErrorMessage("Could not change role", e); }
  }

  async function removeMember(userId: string) {
    try {
      await getApiClient().mutation('org:removeMember', { orgId, userId });
      members = members.filter(m => m.userId !== userId);
    } catch (e) { onErrorMessage("Could not remove", e); }
  }

  async function leaveOrg() {
    try {
      await getApiClient().mutation('org:leave', { orgId });
      window.location.href = '/projects';
    } catch (e) { onErrorMessage("Could not leave", e); }
  }

  async function transferOwnership() {
    if (!transferUserId) return;
    try {
      await getApiClient().mutation('org:transferOwnership', { orgId, newOwnerId: transferUserId });
      onSuccess("Ownership transferred");
      await loadMembers();
    } catch (e) { onErrorMessage("Could not transfer", e); }
  }

  async function deleteOrg() {
    if (confirmDelete !== orgName) return;
    try {
      await getApiClient().mutation('org:delete', { orgId });
      window.location.href = '/projects';
    } catch (e) { onErrorMessage("Could not delete", e); }
  }

  let isOwner = $derived(myRole === 'owner');
  let isAdmin = $derived(myRole === 'owner' || myRole === 'admin');
</script>

<svelte:head>
  <title>Wireloop - Organization Settings</title>
</svelte:head>

<div class="settings-page">
  <header class="settings-header">
    <h1 class="settings-title">Organization Settings</h1>
  </header>

  {#if loading}
    <p class="muted">Loading…</p>
  {:else}
    <div class="settings-content">
      <!-- General (owner only) -->
      <section class="settings-section">
        <h3 class="settings-heading">General</h3>
        <div class="settings-field">
          <Label for="org-name">Name</Label>
          <Input id="org-name" bind:value={orgName} disabled={!isOwner} />
        </div>
        <div class="settings-field">
          <Label for="org-slug">Slug</Label>
          <Input id="org-slug" bind:value={orgSlug} disabled={!isOwner} />
        </div>
        <div class="settings-field">
          <Label for="org-desc">Description</Label>
          <Input id="org-desc" bind:value={orgDescription} disabled={!isOwner} />
        </div>
        {#if isOwner}
          <div class="settings-actions">
            <Button size="sm" disabled={saving} onclick={saveGeneral}>Save</Button>
          </div>
        {/if}
      </section>

      <Separator />

      <!-- Members (admin+) -->
      <section class="settings-section">
        <h3 class="settings-heading">Members</h3>
        <div class="member-list">
          {#each members as m (m.userId)}
            <div class="member-row">
              <div class="member-info">
                <span class="member-name">{m.name}</span>
                <span class="member-email">{m.email}</span>
              </div>
              {#if isAdmin && m.role !== 'owner'}
                <select value={m.role} class="share-role-select" onchange={(e) => changeRole(m.userId, (e.target as HTMLSelectElement).value)}>
                  <option value="viewer">Viewer</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                <button class="share-remove" onclick={() => removeMember(m.userId)}>Remove</button>
              {:else}
                <span class="member-role">{m.role}</span>
              {/if}
            </div>
          {/each}
        </div>

        {#if isAdmin}
          <div class="share-add">
            <Input bind:value={inviteEmail} placeholder="colleague@example.com" />
            <select bind:value={inviteRole} class="share-role-select">
              <option value="viewer">Viewer</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <Button size="sm" onclick={invite}>Invite</Button>
          </div>
        {/if}
      </section>

      <Separator />

      <!-- Danger zone -->
      <section class="settings-section">
        <h3 class="settings-heading">Danger zone</h3>
        {#if isOwner}
          <div class="danger-block">
            <p class="danger-label">Transfer ownership</p>
            <div class="share-add">
              <select bind:value={transferUserId} class="share-role-select">
                <option value="">Select member…</option>
                {#each members.filter(m => m.role !== 'owner') as m (m.userId)}
                  <option value={m.userId}>{m.name}</option>
                {/each}
              </select>
              <Button size="sm" variant="ghost" disabled={!transferUserId} onclick={transferOwnership}>Transfer</Button>
            </div>
          </div>
          <div class="danger-block">
            <p class="danger-label">Delete organization</p>
            <div class="share-add">
              <Input bind:value={confirmDelete} placeholder="Type org name to confirm" />
              <Button size="sm" variant="ghost" disabled={confirmDelete !== orgName} onclick={deleteOrg}>Delete</Button>
            </div>
          </div>
        {:else}
          <div class="danger-block">
            <p class="danger-label">Leave organization</p>
            <Button size="sm" variant="ghost" onclick={leaveOrg}>Leave</Button>
          </div>
        {/if}
      </section>
    </div>
  {/if}
</div>

<style>
  .settings-page { max-width: 680px; margin: 0 auto; padding: 2.5rem 1.5rem; }
  .settings-header { margin-bottom: 2rem; }
  .settings-title { font-size: 1.75rem; font-weight: 600; margin: 0; color: hsl(var(--foreground)); letter-spacing: -0.02em; }
  .settings-content { display: flex; flex-direction: column; }
  .settings-section { padding: 1.5rem 0; }
  .settings-heading { font-size: 0.8125rem; font-weight: 600; margin: 0 0 1rem; color: hsl(var(--foreground)); letter-spacing: 0.01em; }
  .settings-field { margin-bottom: 1rem; }
  .settings-field :global(label) { display: block; font-size: 0.8125rem; margin-bottom: 0.375rem; color: hsl(var(--muted-foreground)); }
  .settings-actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
  .muted { color: hsl(var(--muted-foreground)); font-size: 0.875rem; }
  .member-list { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
  .member-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 0.75rem; background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: var(--radius); transition: border-color 150ms; }
  .member-row:hover { border-color: hsl(var(--border-strong)); }
  .member-info { flex: 1; display: flex; flex-direction: column; min-width: 0; gap: 0.125rem; }
  .member-name { font-size: 0.875rem; font-weight: 500; color: hsl(var(--foreground)); }
  .member-email { font-size: 0.75rem; color: hsl(var(--muted-foreground)); }
  .member-role { font-size: 0.6875rem; font-weight: 500; color: hsl(var(--muted-foreground)); text-transform: uppercase; letter-spacing: 0.04em; }
  .share-add { display: flex; gap: 0.5rem; align-items: center; }
  .share-role-select {
    height: 36px;
    padding: 0 0.5rem;
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    font-size: 0.8125rem;
    background: hsl(var(--background));
    color: hsl(var(--foreground));
    cursor: pointer;
    transition: border-color 150ms;
  }
  .share-role-select:focus-visible {
    outline: none;
    border-color: hsl(var(--ring));
    box-shadow: 0 0 0 2px hsla(var(--ring) / 0.3);
  }
  .share-remove {
    font-size: 0.75rem;
    font-weight: 500;
    color: hsl(var(--muted-foreground));
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    transition: color 150ms, background 150ms;
  }
  .share-remove:hover {
    color: hsl(var(--destructive));
    background: hsla(var(--destructive) / 0.1);
  }
  .danger-block {
    margin-bottom: 1.25rem;
    padding: 1rem;
    border: 1px solid hsla(var(--destructive) / 0.2);
    border-radius: var(--radius);
    background: hsla(var(--destructive) / 0.03);
  }
  .danger-label { font-size: 0.8125rem; font-weight: 500; margin: 0 0 0.5rem; color: hsl(var(--destructive)); }

  @media (max-width: 640px) {
    .share-add { flex-direction: column; align-items: stretch; }
    .share-role-select { width: 100%; }
  }
</style>
