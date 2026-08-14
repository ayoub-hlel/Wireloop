<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { getApiClient } from "../../../stores/api.client";
  import X from '@lucide/svelte/icons/x';

  type MatchedUser = { userId: string; name: string; email: string };

  type Props = {
    open?: boolean;
    onSuccess?: (orgId: string) => void;
  };

  let { open = $bindable(false), onSuccess = () => {} }: Props = $props();

  let name = $state('');
  let description = $state('');
  let searchInput = $state('');
  let selected = $state<MatchedUser[]>([]);
  let results = $state<MatchedUser[]>([]);
  let dropdownOpen = $state(false);
  let submitting = $state(false);
  let error = $state('');

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  let canSubmit = $derived(!submitting && name.trim().length > 0);

  function addUser(user: MatchedUser) {
    if (!selected.find(s => s.userId === user.userId)) {
      selected = [...selected, user];
    }
    searchInput = '';
    results = [];
    dropdownOpen = false;
  }

  function removeUser(userId: string) {
    selected = selected.filter(s => s.userId !== userId);
  }

  function addRawEmail() {
    const email = searchInput.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    if (!selected.find(s => s.email === email)) {
      // ponytail: allow free-text emails (no account yet) — server handles email-only invite.
      selected = [...selected, { userId: '', name: email, email }];
    }
    searchInput = '';
    results = [];
    dropdownOpen = false;
  }

  async function onInput() {
    const q = searchInput.trim().toLowerCase();
    if (debounceTimer) clearTimeout(debounceTimer);
    if (q.length < 2) {
      results = [];
      dropdownOpen = false;
      return;
    }
    debounceTimer = setTimeout(async () => {
      try {
        const res = (await getApiClient().query('users:search', { q, limit: 8 })) as MatchedUser[];
        results = res.filter(r => !selected.find(s => s.userId === r.userId));
        dropdownOpen = results.length > 0;
      } catch {
        results = [];
        dropdownOpen = false;
      }
    }, 300);
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (results.length > 0) {
        addUser(results[0]);
      } else if (searchInput.trim()) {
        addRawEmail();
      }
    } else if (e.key === 'Backspace' && !searchInput && selected.length > 0) {
      removeUser(selected[selected.length - 1].userId || selected[selected.length - 1].email);
    } else if (e.key === 'Escape') {
      dropdownOpen = false;
    }
  }

  async function handleCreate() {
    error = '';
    submitting = true;
    try {
      const invitees = selected.map(s => s.email);
      const res = (await getApiClient().mutation('org:create', {
        name: name.trim(),
        description: description.trim(),
        invitees,
      })) as { orgId: string; invitesSent: number };
      onSuccess(res.orgId);
      resetAndClose();
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Failed to create organization';
    } finally {
      submitting = false;
    }
  }

  function resetAndClose() {
    open = false;
    name = '';
    description = '';
    searchInput = '';
    selected = [];
    results = [];
    dropdownOpen = false;
    error = '';
  }

  // ponytail: reset form when dialog opens fresh
  $effect(() => {
    if (open && !name && !description && selected.length === 0) {
      // fresh open — nothing to do, form is already clean
    }
  });
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content class="sm:max-w-md">
      <Dialog.Header>
        <Dialog.Title>Create organization</Dialog.Title>
        <Dialog.Description>
          Create an organization to collaborate with your team.
        </Dialog.Description>
      </Dialog.Header>

      {#if error}
        <div class="mb-4 p-3 rounded-md text-sm bg-destructive/10 border border-destructive/30 text-destructive">
          {error}
        </div>
      {/if}

      <form onsubmit={(e) => { e.preventDefault(); handleCreate(); }} class="flex flex-col gap-4">
        <div class="grid gap-1.5">
          <Label for="org-name">Name *</Label>
          <Input id="org-name" bind:value={name} placeholder="Acme Robotics" required />
        </div>

        <div class="grid gap-1.5">
          <Label for="org-description">Description</Label>
          <textarea
            id="org-description"
            bind:value={description}
            placeholder="What's this organization about?"
            rows={2}
            class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          ></textarea>
        </div>

        <div class="grid gap-1.5 relative">
          <Label for="org-invitees">Invite members</Label>
          <div class="invite-input-wrap">
            {#if selected.length > 0}
              <div class="invite-chips">
                {#each selected as user (user.userId || user.email)}
                  <span class="invite-chip">
                    {user.name}
                    <button
                      type="button"
                      class="invite-chip-remove"
                      onclick={() => removeUser(user.userId || user.email)}
                      aria-label={`Remove ${user.name}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                {/each}
              </div>
            {/if}
            <input
              id="org-invitees"
              bind:value={searchInput}
              oninput={onInput}
              onkeydown={onKeydown}
              onfocus={() => { if (results.length > 0) dropdownOpen = true; }}
              placeholder={selected.length ? 'Add more...' : 'Type an email to search...'}
              class="invite-input"
              autocomplete="off"
            />
          </div>

          {#if dropdownOpen && results.length > 0}
            <div class="invite-dropdown">
              {#each results as user (user.userId)}
                <button
                  type="button"
                  class="invite-dropdown-item"
                  onclick={() => addUser(user)}
                >
                  <span class="invite-dropdown-name">{user.name}</span>
                  <span class="invite-dropdown-email">{user.email}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <Dialog.Footer>
          <Button variant="outline" type="button" onclick={resetAndClose}>Cancel</Button>
          <Button type="submit" disabled={!canSubmit}>
            {submitting ? 'Creating...' : 'Create organization'}
          </Button>
        </Dialog.Footer>
      </form>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  .invite-input-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    align-items: center;
    padding: 0.375rem 0.5rem;
    border: 1px solid hsl(var(--input));
    border-radius: 0.375rem;
    background: transparent;
    min-height: 2.25rem;
  }

  .invite-input-wrap:focus-within {
    outline: none;
    box-shadow: 0 0 0 2px hsl(var(--ring));
  }

  .invite-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .invite-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    background: hsl(var(--secondary));
    font-size: 0.75rem;
    color: hsl(var(--foreground));
    white-space: nowrap;
  }

  .invite-chip-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: hsl(var(--muted-foreground));
    cursor: pointer;
    padding: 0;
  }

  .invite-chip-remove:hover {
    background: hsl(var(--muted));
    color: hsl(var(--foreground));
  }

  .invite-input {
    flex: 1;
    min-width: 120px;
    border: none;
    background: transparent;
    font-size: 0.875rem;
    outline: none;
    padding: 0.125rem 0;
    color: hsl(var(--foreground));
  }

  .invite-input::placeholder {
    color: hsl(var(--muted-foreground));
  }

  .invite-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 50;
    margin-top: 0.25rem;
    border: 1px solid hsl(var(--border));
    border-radius: 0.375rem;
    background: hsl(var(--popover));
    box-shadow: var(--shadow-elevated);
    max-height: 200px;
    overflow-y: auto;
  }

  .invite-dropdown-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    transition: background 150ms;
  }

  .invite-dropdown-item:hover {
    background: hsl(var(--secondary));
  }

  .invite-dropdown-name {
    font-size: 0.8125rem;
    font-weight: 500;
    color: hsl(var(--foreground));
  }

  .invite-dropdown-email {
    font-size: 0.6875rem;
    color: hsl(var(--muted-foreground));
  }
</style>
