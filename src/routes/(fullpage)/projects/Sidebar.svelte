<script lang="ts">
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import OrgSwitcher from "./OrgSwitcher.svelte";
  import Folder from '@lucide/svelte/icons/folder';
  import Star from '@lucide/svelte/icons/star';
  import Users from '@lucide/svelte/icons/users';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Plus from '@lucide/svelte/icons/plus';
  import Sun from '@lucide/svelte/icons/sun';
  import Moon from '@lucide/svelte/icons/moon';
  import PanelLeftClose from '@lucide/svelte/icons/panel-left-close';
  import PanelLeftOpen from '@lucide/svelte/icons/panel-left-open';
  import Settings from '@lucide/svelte/icons/settings';
  import LogOut from '@lucide/svelte/icons/log-out';
  import { toggleTheme } from "$lib/theme";
  import type { OrgInfo } from "../../../stores/org.store";
  import type { DashboardFilter } from './dashboard.svelte.ts';

  type Props = {
    userName?: string;
    userEmail?: string;
    userImage?: string | null;
    orgs?: OrgInfo[];
    selectedOrgId?: string | null;
    filter?: DashboardFilter;
    canCreate?: boolean;
    onSelectOrg?: (orgId: string | null) => void;
    onFilterChange?: (filter: DashboardFilter) => void;
    onSignOut?: () => Promise<void>;
    onOpenSettings?: () => void;
    onNewProject?: () => void;
    onCreateOrg?: () => void;
  };

  let {
    userName = "",
    userEmail = "",
    userImage = null as string | null,
    orgs = [] as OrgInfo[],
    selectedOrgId = $bindable(null as string | null),
    filter = 'projects' as DashboardFilter,
    canCreate = true,
    onSelectOrg = () => {},
    onFilterChange = () => {},
    onSignOut = async () => {},
    onOpenSettings = () => {},
    onNewProject = () => {},
    onCreateOrg = () => {},
  }: Props = $props();

  let collapsed = $state(false);

  function getInitials(name: string): string {
    return name.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  }

  const filterItems: { id: DashboardFilter; label: string; icon: typeof Folder }[] = [
    { id: 'projects', label: 'Projects', icon: Folder },
    { id: 'starred', label: 'Starred', icon: Star },
    { id: 'community', label: 'Community', icon: Users },
    { id: 'trash', label: 'Trash', icon: Trash2 },
  ];
</script>

{#snippet userTrigger({ props }: { props: Record<string, unknown> })}
  <DropdownMenu.DropdownMenuTrigger
    {...props}
    class="sidebar-user-trigger"
    aria-label="Account menu"
  >
    <Avatar.Root class="sidebar-avatar">
      {#if userImage}<Avatar.Image src={userImage} alt={userName} />{/if}
      <Avatar.Fallback class="sidebar-avatar-fallback">{getInitials(userName || '?')}</Avatar.Fallback>
    </Avatar.Root>
    <span class="sidebar-user-name">{userName || 'User'}</span>
  </DropdownMenu.DropdownMenuTrigger>
{/snippet}

<!-- ═══════════════════════════════════════════════════════════════
     DESKTOP SIDEBAR — collapsible, narrow
     ═══════════════════════════════════════════════════════════════ -->
<aside class="sidebar" class:collapsed>
  <div class="sidebar-inner">
    <!-- User (top) -->
    <div class="sidebar-top">
      <DropdownMenu.DropdownMenu>
        <Tooltip.Root>
          <Tooltip.Trigger child={userTrigger} />
          {#if collapsed}
            <Tooltip.Content side="right">{userName || 'User'}</Tooltip.Content>
          {/if}
        </Tooltip.Root>
        <DropdownMenu.DropdownMenuContent class="w-52" side="bottom" align="start">
          <DropdownMenu.DropdownMenuGroup>
            <div class="menu-user-header">
              <Avatar.Root class="menu-user-avatar">
                {#if userImage}<Avatar.Image src={userImage} alt={userName} />{/if}
                <Avatar.Fallback>{getInitials(userName || '?')}</Avatar.Fallback>
              </Avatar.Root>
              <div class="menu-user-info">
                <div class="menu-user-name">{userName || 'User'}</div>
                <div class="menu-user-email">{userEmail}</div>
              </div>
            </div>
          </DropdownMenu.DropdownMenuGroup>
          <DropdownMenu.DropdownMenuSeparator />
          <DropdownMenu.DropdownMenuGroup>
            <DropdownMenu.DropdownMenuItem onclick={onOpenSettings}>
              <Settings size={14} />
              <span>Settings</span>
            </DropdownMenu.DropdownMenuItem>
          </DropdownMenu.DropdownMenuGroup>
          <DropdownMenu.DropdownMenuSeparator />
          <DropdownMenu.DropdownMenuItem variant="destructive" onclick={onSignOut}>
            <LogOut size={14} />
            <span>Log out</span>
          </DropdownMenu.DropdownMenuItem>
        </DropdownMenu.DropdownMenuContent>
      </DropdownMenu.DropdownMenu>
    </div>

    <!-- General: global filters -->
    <div class="sidebar-section">
      <span class="sidebar-section-label">General</span>
      <nav class="sidebar-nav">
        {#each filterItems.filter(i => i.id === 'starred' || i.id === 'community') as item (item.id)}
          <Tooltip.Root>
            <Tooltip.Trigger
              class={filter === item.id ? 'sidebar-nav-item active' : 'sidebar-nav-item'}
              onclick={() => onFilterChange(item.id)}
              aria-label={item.label}
            >
              <item.icon size={18} />
              <span class="sidebar-nav-label">{item.label}</span>
            </Tooltip.Trigger>
            {#if collapsed}
              <Tooltip.Content side="right">{item.label}</Tooltip.Content>
            {/if}
          </Tooltip.Root>
        {/each}
      </nav>
    </div>

    <!-- Org switcher -->
    <div class="sidebar-section sidebar-org-section">
      <OrgSwitcher {orgs} bind:selectedOrgId {onSelectOrg} onCreateOrg={onCreateOrg} {collapsed} />
    </div>

    <!-- Org-scoped filters -->
    <div class="sidebar-section">
      <nav class="sidebar-nav">
        {#each filterItems.filter(i => i.id === 'projects' || i.id === 'trash') as item (item.id)}
          <Tooltip.Root>
            <Tooltip.Trigger
              class={filter === item.id ? 'sidebar-nav-item active' : 'sidebar-nav-item'}
              onclick={() => onFilterChange(item.id)}
              aria-label={item.label}
            >
              <item.icon size={18} />
              <span class="sidebar-nav-label">{item.label}</span>
            </Tooltip.Trigger>
            {#if collapsed}
              <Tooltip.Content side="right">{item.label}</Tooltip.Content>
            {/if}
          </Tooltip.Root>
        {/each}
      </nav>
    </div>

    <!-- New project -->
    {#if canCreate}
      <Tooltip.Root>
        <Tooltip.Trigger
          class="sidebar-new-btn"
          onclick={onNewProject}
          aria-label="New project"
        >
          <Plus size={18} />
          <span class="sidebar-nav-label">New project</span>
        </Tooltip.Trigger>
        {#if collapsed}
          <Tooltip.Content side="right">New project</Tooltip.Content>
        {/if}
      </Tooltip.Root>
    {/if}

    <!-- Spacer -->
    <div class="sidebar-spacer"></div>

    <!-- Bottom section: theme above collapse, separated -->
    <div class="sidebar-bottom">
      <Tooltip.Root>
        <Tooltip.Trigger
          class="sidebar-nav-item"
          onclick={toggleTheme}
          aria-label="Toggle theme"
        >
          <Sun size={18} class="theme-icon-sun" />
          <Moon size={18} class="theme-icon-moon" />
          <span class="sidebar-nav-label">Toggle theme</span>
        </Tooltip.Trigger>
        {#if collapsed}
          <Tooltip.Content side="right">Toggle theme</Tooltip.Content>
        {/if}
      </Tooltip.Root>

      <div class="sidebar-bottom-sep"></div>

      <Tooltip.Root>
        <Tooltip.Trigger
          class="sidebar-nav-item"
          onclick={() => collapsed = !collapsed}
          aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
        >
          {#if collapsed}
            <PanelLeftOpen size={18} />
          {:else}
            <PanelLeftClose size={18} />
          {/if}
          <span class="sidebar-nav-label">Collapse menu</span>
        </Tooltip.Trigger>
        {#if collapsed}
          <Tooltip.Content side="right">Expand menu</Tooltip.Content>
        {/if}
      </Tooltip.Root>
    </div>
  </div>
</aside>

<!-- ═══════════════════════════════════════════════════════════════
     MOBILE BOTTOM NAV — icon-only, like Instagram/Facebook
     ═══════════════════════════════════════════════════════════════ -->
<nav class="mobile-nav">
  {#each filterItems as item (item.id)}
    <button
      class="mobile-nav-item"
      class:active={filter === item.id}
      onclick={() => onFilterChange(item.id)}
      aria-label={item.label}
    >
      <item.icon size={22} />
    </button>
  {/each}
  {#if canCreate}
    <button class="mobile-nav-item mobile-nav-add" onclick={onNewProject} aria-label="New project">
      <Plus size={22} />
    </button>
  {/if}
  <button class="mobile-nav-item" onclick={toggleTheme} aria-label="Toggle theme">
    <Sun size={22} class="theme-icon-sun" />
    <Moon size={22} class="theme-icon-moon" />
  </button>
</nav>

<style>
  /* ── Desktop sidebar ──────────────────────────────────────── */
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 200px;
    height: 100vh;
    border-right: 1px solid hsl(var(--border));
    background-color: hsl(var(--background));
    z-index: 40;
    transition: width 200ms ease;
  }

  .sidebar.collapsed {
    width: 64px;
  }

  .sidebar-inner {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 0.75rem 0.5rem;
    gap: 0.25rem;
    overflow: hidden;
  }

  /* Section grouping */
  .sidebar-section {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .sidebar-section-label {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: hsl(var(--muted-foreground) / 0.7);
    padding: 0.375rem 0.5rem 0.25rem;
    white-space: nowrap;
    overflow: hidden;
    transition: opacity 150ms;
  }

  .collapsed .sidebar-section-label {
    opacity: 0;
  }

  /* Nav items */
  .sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  :global(.sidebar-nav-item) {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    width: 100%;
    min-height: 2.25rem;
    padding: 0 0.5rem;
    border: none;
    border-radius: 0.375rem;
    background: transparent;
    color: hsl(var(--muted-foreground));
    cursor: pointer;
    font-size: 0.8125rem;
    font-weight: 500;
    transition: background 150ms, color 150ms;
  }

  :global(.sidebar-nav-item:hover) {
    background-color: hsl(var(--sidebar-accent));
    color: hsl(var(--sidebar-accent-foreground));
  }

  :global(.sidebar-nav-item.active) {
    background-color: hsl(var(--sidebar-accent));
    color: hsl(var(--sidebar-accent-foreground));
  }

  :global(.sidebar-nav-item:focus-visible),
  :global(.sidebar-new-btn:focus-visible) {
    outline: 2px solid hsl(var(--ring));
    outline-offset: -2px;
  }

  :global(.sidebar-nav-item svg),
  :global(.sidebar-new-btn svg) {
    width: 18px;
    height: 18px;
    flex: 0 0 18px;
  }

  .sidebar-nav-label {
    overflow: hidden;
    white-space: nowrap;
    transition: opacity 150ms;
  }

  .collapsed .sidebar-nav-label {
    opacity: 0;
  }

  /* New project button */
  :global(.sidebar-new-btn) {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    width: 100%;
    min-height: 2.25rem;
    padding: 0 0.5rem;
    margin-top: 0.25rem;
    border: none;
    border-radius: 0.375rem;
    background: transparent;
    color: hsl(var(--foreground));
    cursor: pointer;
    font-size: 0.8125rem;
    font-weight: 500;
    transition: background 150ms;
  }

  :global(.sidebar-new-btn:hover) {
    background-color: hsl(var(--sidebar-accent));
    color: hsl(var(--sidebar-accent-foreground));
  }

  /* Spacer */
  .sidebar-spacer {
    flex: 1;
  }

  /* User trigger (top) */
  .sidebar-top {
    display: flex;
    padding-bottom: 0.5rem;
    margin-bottom: 0.25rem;
    border-bottom: 1px solid hsl(var(--border));
  }

  :global(.sidebar-user-trigger) {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    min-height: 2.25rem;
    padding: 0 0.5rem;
    border-radius: 0.375rem;
    border: none;
    background: transparent;
    color: hsl(var(--foreground));
    cursor: pointer;
    text-align: left;
    min-width: 0;
  }

  :global(.sidebar-user-trigger:hover) {
    background-color: hsl(var(--sidebar-accent));
    color: hsl(var(--sidebar-accent-foreground));
  }

  :global(.sidebar-user-trigger:focus-visible) {
    outline: 2px solid hsl(var(--ring));
    outline-offset: -2px;
  }

  .sidebar-user-name {
    font-size: 0.8125rem;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: opacity 150ms;
  }

  .collapsed .sidebar-user-name {
    opacity: 0;
  }

  /* User dropdown */
  .menu-user-header {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.5rem;
  }

  :global(.menu-user-avatar) {
    width: 36px !important;
    height: 36px !important;
    flex-shrink: 0;
  }

  .menu-user-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .menu-user-name {
    font-size: 0.8125rem;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .menu-user-email {
    font-size: 0.6875rem;
    color: hsl(var(--muted-foreground));
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :global(.theme-icon-sun) { display: none; }
  :global([data-theme="dark"] .theme-icon-sun) { display: block; }
  :global([data-theme="dark"] .theme-icon-moon) { display: none; }

  /* Bottom section */
  .sidebar-bottom {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    padding-top: 0.5rem;
    border-top: 1px solid hsl(var(--border));
  }

  .sidebar-bottom-sep {
    border-top: 1px solid hsl(var(--border));
    margin: 0.25rem 0;
  }

  .sidebar-org-section {
    margin-top: 0.375rem;
    padding-top: 0.5rem;
    border-top: 1px solid hsl(var(--border));
  }

  /* ── Mobile bottom nav ─────────────────────────────────────── */
  .mobile-nav {
    display: none;
  }

  /* ── Responsive ────────────────────────────────────────────── */
  @media (max-width: 768px) {
    .sidebar {
      display: none;
    }

    .mobile-nav {
      display: flex;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 56px;
      background-color: hsl(var(--background));
      border-top: 1px solid hsl(var(--border));
      z-index: 50;
      align-items: center;
      justify-content: space-around;
      padding: 0 0.5rem;
      padding-bottom: env(safe-area-inset-bottom, 0);
    }

    .mobile-nav-item {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border: none;
      border-radius: 0.5rem;
      background: transparent;
      color: hsl(var(--muted-foreground));
      cursor: pointer;
    }

    .mobile-nav-item.active {
      color: hsl(var(--foreground));
    }

    .mobile-nav-item:active {
      background-color: hsl(var(--secondary));
    }

    .mobile-nav-add {
      color: hsl(var(--accent));
    }
  }
</style>
