<script lang="ts">
  import * as Popover from "$lib/components/ui/popover/index.js";
  import * as Command from "$lib/components/ui/command/index.js";
  import type { OrgInfo } from "../../../stores/org.store";

  type Props = {
    orgs?: OrgInfo[];
    selectedOrgId?: string | null;
    onSelectOrg?: (orgId: string | null) => void;
  };

  let {
    orgs = [] as OrgInfo[],
    selectedOrgId = $bindable(null as string | null),
    onSelectOrg = (orgId: string | null) => {},
  }: Props = $props();

  let open = $state(false);
  let search = $state("");

  let filtered = $derived(
    search
      ? orgs.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))
      : orgs
  );

  let currentOrg = $derived(
    selectedOrgId ? orgs.find(o => o.id === selectedOrgId) : null
  );

  function selectOrg(orgId: string | null) {
    onSelectOrg(orgId);
    open = false;
    search = "";
  }

  function getInitials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map(w => w[0])
      .join("")
      .toUpperCase();
  }
</script>

<div class="org-row">
  <Popover.Root bind:open>
    <Popover.Trigger
      type="button"
      role="combobox"
      aria-expanded={open}
      class="org-trigger"
    >
        {#if currentOrg}
          <span class="org-icon">{getInitials(currentOrg.name)}</span>
          <span class="org-name">{currentOrg.name}</span>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="org-icon-svg"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span class="org-name">Personal</span>
        {/if}
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="org-chevron"><path d="m6 9 6 6 6-6"/></svg>
    </Popover.Trigger>

  <Popover.Content class="w-[220px] p-0">
    <Command.Root>
      <Command.Input bind:value={search} placeholder="Search organizations..." />
      <Command.List>
        <Command.Empty>No organizations found.</Command.Empty>
        <Command.Group>
          <Command.Item
            onselect={() => selectOrg(null)}
            class={selectedOrgId === null ? "selected-org" : ""}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span>Personal</span>
            {#if selectedOrgId === null}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-auto"><path d="M20 6 9 17l-5-5"/></svg>
            {/if}
          </Command.Item>
        </Command.Group>
        <Command.Separator />
        <Command.Group heading="Organizations">
          {#each filtered as org (org.id)}
            <Command.Item
              onselect={() => selectOrg(org.id)}
              class={selectedOrgId === org.id ? "selected-org" : ""}
            >
              <span class="flex size-5 items-center justify-center rounded-xs bg-muted text-[10px] font-semibold mr-2">
                {getInitials(org.name)}
              </span>
              <span class="truncate">{org.name}</span>
              {#if selectedOrgId === org.id}
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-auto"><path d="M20 6 9 17l-5-5"/></svg>
              {/if}
            </Command.Item>
          {/each}
        </Command.Group>
      </Command.List>
    </Command.Root>
  </Popover.Content>
  </Popover.Root>
</div>

<style>
  .org-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  :global(.org-trigger) {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    padding: 0.25rem 0.375rem;
    border: none;
    border-radius: 0.375rem;
    background: transparent;
    color: hsl(var(--sidebar-foreground));
    cursor: pointer;
    font-size: 0.8125rem;
    text-align: left;
    line-height: 24px;
  }

  :global(.org-trigger:hover) {
    background-color: hsl(var(--sidebar-accent));
  }

  .org-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    background-color: hsl(var(--muted));
    font-size: 10px;
    font-weight: 600;
    flex-shrink: 0;
    color: hsl(var(--foreground));
  }

  .org-icon-svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    color: hsl(var(--sidebar-foreground) / 0.6);
  }

  .org-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .org-chevron {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    opacity: 0.5;
    margin-left: auto;
  }

  :global(.selected-org) {
    background-color: hsl(var(--accent));
    color: hsl(var(--accent-foreground));
  }
</style>
