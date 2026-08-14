<script lang="ts">
  import * as Popover from "$lib/components/ui/popover/index.js";
  import * as Command from "$lib/components/ui/command/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import type { OrgInfo } from "../../../stores/org.store";

  type Props = {
    orgs?: OrgInfo[];
    selectedOrgId?: string | null;
    collapsed?: boolean;
    onSelectOrg?: (orgId: string | null) => void;
    onCreateOrg?: () => void;
  };

  let {
    orgs = [] as OrgInfo[],
    selectedOrgId = $bindable(null as string | null),
    collapsed = false,
    onSelectOrg = () => {},
    onCreateOrg = () => {},
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

{#snippet orgTrigger({ props }: { props: Record<string, unknown> })}
  <Popover.Trigger
    {...props}
    type="button"
    role="combobox"
    aria-expanded={open}
    class="org-trigger"
  >
    {#if currentOrg}
      <span class="org-icon">{getInitials(currentOrg.name)}</span>
    {:else}
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="org-icon-svg"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    {/if}
    <span class="org-name">{currentOrg ? currentOrg.name : 'Personal'}</span>
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="org-chevron"><path d="m6 9 6 6 6-6"/></svg>
  </Popover.Trigger>
{/snippet}

<div class="org-row" class:collapsed>
  <Popover.Root bind:open>
    <Tooltip.Root>
      <Tooltip.Trigger child={orgTrigger} />
      {#if collapsed}
        <Tooltip.Content side="right">{currentOrg ? currentOrg.name : 'Personal'}</Tooltip.Content>
      {/if}
    </Tooltip.Root>

  <Popover.Content class="w-[220px] p-0">
    <Command.Root>
      <Command.Input bind:value={search} placeholder="Search organizations..." />
      <Command.List>
        <Command.Empty>No organizations found.</Command.Empty>
        <Command.Group>
          <Command.Item
            onSelect={() => selectOrg(null)}
            class={`org-item cursor-pointer ${selectedOrgId === null ? "selected-org" : ""}`}
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
              onSelect={() => selectOrg(org.id)}
              class={`org-item cursor-pointer ${selectedOrgId === org.id ? "selected-org" : ""}`}
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
    <button
      class="org-create-btn"
      onclick={() => {
        open = false;
        onCreateOrg();
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
      <span>Create organization</span>
    </button>
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
    width: 100%;
    min-height: 2.25rem;
    padding: 0 0.5rem;
    border: none;
    border-radius: 0.375rem;
    background: transparent;
    color: hsl(var(--sidebar-foreground));
    cursor: pointer;
    font-size: 0.8125rem;
    text-align: left;
    line-height: 1.25rem;
  }

  :global(.org-trigger:hover) {
    background-color: hsl(var(--sidebar-accent));
  }

  :global(.org-trigger:focus-visible) {
    background-color: hsl(var(--sidebar-accent));
    outline: 2px solid hsl(var(--ring));
    outline-offset: -1px;
  }

  :global(.org-item) {
    cursor: pointer;
    transition: background-color 120ms;
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
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: opacity 150ms;
  }

  .org-row.collapsed .org-name {
    opacity: 0;
  }

  .org-chevron {
    width: 16px;
    height: 16px;
    flex-shrink: 1;
    min-width: 0;
    opacity: 0.5;
    margin-left: auto;
    transition: opacity 150ms;
  }

  .org-row.collapsed .org-chevron {
    opacity: 0;
  }

  :global(.selected-org) {
    background-color: hsl(var(--accent));
    color: hsl(var(--accent-foreground));
  }

  .org-create-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.5rem 0.75rem;
    margin-top: 0.25rem;
    border: none;
    border-top: 1px solid hsl(var(--border));
    border-radius: 0;
    background: transparent;
    color: hsl(var(--accent));
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: color 150ms;
  }

  .org-create-btn:hover {
    color: hsl(var(--accent) / 0.8);
  }

  .org-create-btn:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: -1px;
  }
</style>
