<script lang="ts">
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import OrgSwitcher from "./OrgSwitcher.svelte";
  import Undo2 from '@lucide/svelte/icons/undo-2';
  import Sun from '@lucide/svelte/icons/sun';
  import Moon from '@lucide/svelte/icons/moon';
  import { toggleTheme, setTheme, getTheme } from "$lib/theme";
  import type { OrgInfo } from "../../../stores/org.store";

  type SidebarItem = { id: string; name: string };

  type Props = {
    userName?: string;
    userEmail?: string;
    userImage?: string | null;
    searchTerm?: string;
    orgs?: OrgInfo[];
    selectedOrgId?: string | null;
    trash?: SidebarItem[];
    starred?: SidebarItem[];
    onSelectOrg?: (orgId: string | null) => void;
    onSignOut?: () => Promise<void>;
    onRestore?: (id: string) => void;
    onOpenSettings?: () => void;
    onNewProject?: () => void;
  };

  let {
    userName = "",
    userEmail = "",
    userImage = null as string | null,
    searchTerm = $bindable(""),
    orgs = [] as OrgInfo[],
    selectedOrgId = $bindable(null as string | null),
    trash = [] as SidebarItem[],
    starred = [] as SidebarItem[],
    onSelectOrg = () => {},
    onSignOut = async () => {},
    onRestore = () => {},
    onOpenSettings = () => {},
    onNewProject = () => {},
  }: Props = $props();

  let theme = $state<"light" | "dark">(getTheme());

  function getInitials(name: string): string {
    return name.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  }

  let starredOpen = $state(true);
  let trashOpen = $state(true);
</script>

<aside class="sidebar">
  <div class="sidebar-inner">
    <div class="sidebar-top-row">
      <DropdownMenu.DropdownMenu>
        <DropdownMenu.DropdownMenuTrigger class="sidebar-user-trigger" aria-label="Account dropdown for {userName}">
          <Avatar.Root class="avatar-sm">
            {#if userImage}
              <Avatar.Image src={userImage} alt={userName} />
            {/if}
            <Avatar.Fallback class="avatar-sm-fallback">{getInitials(userName || '?')}</Avatar.Fallback>
          </Avatar.Root>
          <span class="sidebar-user-name">{userName || "User"}</span>
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="sidebar-chevron"><path fill="currentColor" d="M9.768 6.768a.5.5 0 0 1 .707.707l-2.12 2.121a.5.5 0 0 1-.708 0L5.525 7.475a.5.5 0 0 1 .708-.707l1.768 1.767z"/></svg>
        </DropdownMenu.DropdownMenuTrigger>
        <DropdownMenu.DropdownMenuContent class="w-56" side="bottom" align="start">
          <DropdownMenu.DropdownMenuGroup>
            <div class="menu-user-header">
              <Avatar.Root class="menu-user-avatar">
                {#if userImage}
                  <Avatar.Image src={userImage} alt={userName} />
                {/if}
                <Avatar.Fallback>{getInitials(userName || '?')}</Avatar.Fallback>
              </Avatar.Root>
              <div class="menu-user-info">
                <div class="menu-user-name">{userName || "User"}</div>
                <div class="menu-user-email">{userEmail}</div>
              </div>
            </div>
          </DropdownMenu.DropdownMenuGroup>
          <DropdownMenu.DropdownMenuSeparator />
          <DropdownMenu.DropdownMenuGroup>
            <DropdownMenu.DropdownMenuSub>
              <DropdownMenu.DropdownMenuSubTrigger>
                <Sun size={16} class="menu-lead-icon theme-icon-sun" />
                <Moon size={16} class="menu-lead-icon theme-icon-moon" />
                <span>Change theme</span>
              </DropdownMenu.DropdownMenuSubTrigger>
              <DropdownMenu.DropdownMenuSubContent>
                <DropdownMenu.DropdownMenuRadioGroup bind:value={theme} onValueChange={(v) => setTheme(v as "light" | "dark")}>
                  <DropdownMenu.DropdownMenuRadioItem value="dark">Dark</DropdownMenu.DropdownMenuRadioItem>
                  <DropdownMenu.DropdownMenuRadioItem value="light">Light</DropdownMenu.DropdownMenuRadioItem>
                </DropdownMenu.DropdownMenuRadioGroup>
              </DropdownMenu.DropdownMenuSubContent>
            </DropdownMenu.DropdownMenuSub>
            <DropdownMenu.DropdownMenuItem onclick={onOpenSettings}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" class="menu-lead-icon"><path fill="currentColor" d="M8.5 18a.5.5 0 0 0 .5-.5v-1.55a2.5 2.5 0 0 0 0-4.9V6.5a.5.5 0 0 0-1 0v4.55a2.501 2.501 0 0 0 0 4.9v1.55a.5.5 0 0 0 .5.5m7 0a.5.5 0 0 0 .5-.5v-4.55a2.501 2.501 0 0 0 0-4.9V6.5a.5.5 0 0 0-1 0v1.55a2.5 2.5 0 0 0 0 4.9v4.55a.5.5 0 0 0 .5.5m0-6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m-7 3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3"/></svg>
              <span>Settings</span>
            </DropdownMenu.DropdownMenuItem>
          </DropdownMenu.DropdownMenuGroup>
          <DropdownMenu.DropdownMenuSeparator />
          <DropdownMenu.DropdownMenuGroup>
            <DropdownMenu.DropdownMenuItem onclick={onSignOut}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" class="menu-lead-icon"><path fill="currentColor" fill-rule="evenodd" d="M7.5 6A1.5 1.5 0 0 0 6 7.5v1a.5.5 0 0 0 1 0v-1a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 0-1 0v1A1.5 1.5 0 0 0 7.5 18h9a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 16.5 6zm4.146 3.146a.5.5 0 0 1 .708 0l2.5 2.5a.5.5 0 0 1 0 .708l-2.5 2.5a.5.5 0 0 1-.708-.708l1.647-1.646H9.5a.5.5 0 0 1 0-1h3.793l-1.647-1.646a.5.5 0 0 1 0-.708" clip-rule="evenodd"/></svg>
              <span>Log out</span>
            </DropdownMenu.DropdownMenuItem>
          </DropdownMenu.DropdownMenuGroup>
        </DropdownMenu.DropdownMenuContent>
      </DropdownMenu.DropdownMenu>

      <button class="sidebar-icon-btn" aria-label="Toggle theme" onclick={toggleTheme}>
        <Sun size={18} class="theme-icon-sun" />
        <Moon size={18} class="theme-icon-moon" />
      </button>

      <button class="sidebar-icon-btn" aria-label="Notifications">
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="M12.992 6.124Q13 6.064 13 6a1 1 0 1 0-1.992.124A4 4 0 0 0 8 10v1.172a5.83 5.83 0 0 1-1.707 4.12A1 1 0 0 0 7 17h3a2 2 0 0 0 4 0h3a1 1 0 0 0 .707-1.707A5.83 5.83 0 0 1 16 11.172V10a4 4 0 0 0-3.008-3.876M12 18a1 1 0 0 1-1-1h2a1 1 0 0 1-1 1m5-2a6.82 6.82 0 0 1-2-4.828V10a3 3 0 1 0-6 0v1.172A6.83 6.83 0 0 1 7 16z" clip-rule="evenodd"/></svg>
      </button>
    </div>

    <div class="sidebar-search">
      <div class="sidebar-search-inner">
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" class="sidebar-search-icon" aria-hidden="true"><path fill="currentColor" d="M11.5 6a5.5 5.5 0 0 1 4.226 9.019l2.127 2.127a.5.5 0 1 1-.707.707l-2.127-2.127A5.5 5.5 0 1 1 11.5 6m0 1a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9"/></svg>
        <Input
          bind:value={searchTerm}
          placeholder="Search"
          class="sidebar-search-input"
        />
      </div>
    </div>

    <button class="sidebar-row" aria-label="Recents">
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" class="sidebar-row-icon"><path fill="currentColor" fill-rule="evenodd" d="M11.5 18a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13m5.5-6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0m-5-3a.5.5 0 0 0-1 0v3a.5.5 0 0 0 .146.354l2 2a.5.5 0 0 0 .708-.708L12 11.293z" clip-rule="evenodd"/></svg>
      <span>Recents</span>
    </button>

    <button class="sidebar-row" aria-label="Community">
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" class="sidebar-row-icon"><path fill="currentColor" d="M16.523 9.21a1 1 0 0 1 1.477.88v4.564c0 .55-.302 1.057-.786 1.32l-5.477 2.965a.5.5 0 0 1-.476 0l-5.476-2.965A1.5 1.5 0 0 1 5 14.654V10.09c0-.758.811-1.24 1.478-.88l5.023 2.72zM6 14.654a.5.5 0 0 0 .262.44l4.737 2.566v-4.863L6 10.09zm5.999-1.857v4.863l4.74-2.566a.5.5 0 0 0 .261-.44V10.09zM11.501 5a2.5 2.5 0 1 1-.002 5.002A2.5 2.5 0 0 1 11.501 5m0 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3"/></svg>
      <span>Community</span>
    </button>

    <div class="sidebar-divider"></div>

    <div class="sidebar-org-section">
      <div class="sidebar-org-section-inner">
        <OrgSwitcher {orgs} bind:selectedOrgId {onSelectOrg} />
      </div>
    </div>

    <div class="sidebar-row" role="button" tabindex="0" aria-label="Projects">
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" class="sidebar-row-icon"><path fill="currentColor" d="M12.598 5.01a.5.5 0 0 1 .255.136l4 4A.5.5 0 0 1 16.5 10h-4a.5.5 0 0 1-.5-.5V6H8.5a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5v-6a.5.5 0 0 1 1 0v6a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 17.5v-11A1.5 1.5 0 0 1 8.5 5h4zM13 9h2.293L13 6.707z"/></svg>
      <span>Projects</span>
      <div class="sidebar-row-end">
        <button class="sidebar-icon-btn sidebar-icon-btn-small" aria-label="New project" onclick={onNewProject}>
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="M11.5 6a.5.5 0 0 1 .5.5V11h4.5a.5.5 0 0 1 0 1H12v4.5a.5.5 0 0 1-1 0V12H6.5a.5.5 0 0 1 0-1H11V6.5a.5.5 0 0 1 .5-.5" clip-rule="evenodd"/></svg>
        </button>
      </div>
    </div>

    <button class="sidebar-row" aria-label="Resources">
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" class="sidebar-row-icon"><path fill="currentColor" fill-rule="evenodd" d="M7 7h10a1 1 0 0 1 1 1v2H6V8a1 1 0 0 1 1-1m-1 4v5a1 1 0 0 0 1 1h2v-6zm4 6h7a1 1 0 0 0 1-1v-5h-8zM5 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" clip-rule="evenodd"/></svg>
      <span>Resources</span>
    </button>

    <button
      class="sidebar-row"
      aria-label="Trash"
      onclick={() => trashOpen = !trashOpen}
    >
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" class="sidebar-row-icon"><path fill="currentColor" d="M16 6a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1h-.04l-.08 1h.62a.5.5 0 0 1 0 1h-.7l-.454 5.621A1.5 1.5 0 0 1 13.85 18H9.149a1.5 1.5 0 0 1-1.495-1.379L7.2 11h-.7a.5.5 0 0 1 0-1h.62l-.08-1H7a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM8.651 16.54a.5.5 0 0 0 .498.46h4.702a.5.5 0 0 0 .498-.46L14.958 9H8.042zm3.496-4.893a.5.5 0 1 1 .707.707l-.647.646.646.646a.5.5 0 1 1-.707.707l-.646-.646-.646.646a.5.5 0 1 1-.707-.707l.646-.646-.646-.646a.5.5 0 1 1 .707-.707l.646.646zM7 8h9V7H7z"/></svg>
      <span>Trash</span>
      {#if trash.length > 0}
        <span class="sidebar-badge">{trash.length}</span>
      {/if}
    </button>
    {#if trashOpen}
      <div class="sidebar-starred-items">
        {#if trash.length > 0}
          {#each trash as item (item.id)}
            <div class="sidebar-row sidebar-row-nested sidebar-trash-row">
              <span class="sidebar-trash-name">{item.name}</span>
              <button
                class="sidebar-icon-btn sidebar-icon-btn-small"
                aria-label="Restore project"
                onclick={() => onRestore(item.id)}
              >
                <Undo2 size={14} />
              </button>
            </div>
          {/each}
        {:else}
          <div class="sidebar-starred-empty">Trash is empty</div>
        {/if}
      </div>
    {/if}

    <div class="sidebar-divider"></div>

    <section class="sidebar-starred-section">
      <div class="sidebar-starred-header">
        <button class="sidebar-starred-toggle" onclick={() => starredOpen = !starredOpen} aria-expanded={starredOpen}>
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="sidebar-starred-chevron" class:sidebar-starred-chevron-open={starredOpen}><path fill="currentColor" d="M9.768 6.768a.5.5 0 0 1 .707.707l-2.12 2.121a.5.5 0 0 1-.708 0L5.525 7.475a.5.5 0 0 1 .708-.707l1.768 1.767z"/></svg>
          <span class="sidebar-starred-label">Starred</span>
        </button>
      </div>
      {#if starredOpen}
        <div class="sidebar-starred-items">
          {#if starred.length > 0}
            {#each starred as item (item.id)}
              <button class="sidebar-row sidebar-row-nested">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" class="sidebar-row-icon"><path fill="currentColor" d="M10.586 6a1.5 1.5 0 0 1 1.06.44L13.208 8H17a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 17 17H7a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 7 6zM7 7a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5v-6A.5.5 0 0 0 17 9h-4.207L10.94 7.146A.5.5 0 0 0 10.586 7zm9 7a.5.5 0 0 1 0 1H8a.5.5 0 0 1 0-1z"/></svg>
                <span>{item.name}</span>
              </button>
            {/each}
          {:else}
            <div class="sidebar-starred-empty">No starred projects</div>
          {/if}
        </div>
      {/if}
    </section>
  </div>
</aside>

<style>
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 16rem;
    height: 100vh;
    border-right: 1px solid hsl(var(--sidebar-border));
    background-color: hsl(var(--sidebar-background));
    display: flex;
    flex-direction: column;
    z-index: 40;
  }

  .sidebar-inner {
    display: flex;
    flex-direction: column;
    padding: 0.5rem 0.25rem 0.5rem 0.5rem;
    overflow-y: auto;
    height: 100%;
    gap: 0.125rem;
  }

  .sidebar-top-row {
    display: flex;
    align-items: center;
    gap: 0;
  }

  :global(.sidebar-user-trigger) {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    padding: 0.25rem 0.375rem;
    border-radius: 0.375rem;
    border: none;
    background: transparent;
    color: hsl(var(--sidebar-foreground));
    cursor: pointer;
    font-size: 0.875rem;
    text-align: left;
  }

  :global(.sidebar-user-trigger:hover) {
    background-color: hsl(var(--sidebar-accent));
  }

  .sidebar-user-name {
    flex: 1;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    line-height: 24px;
  }

  .sidebar-chevron {
    flex-shrink: 0;
    color: hsl(var(--sidebar-foreground) / 0.6);
  }

  .sidebar-icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 0.375rem;
    background: transparent;
    color: hsl(var(--sidebar-foreground) / 0.6);
    cursor: pointer;
    flex-shrink: 0;
  }

  .sidebar-icon-btn:hover {
    background-color: hsl(var(--sidebar-accent));
  }

  .sidebar-icon-btn-small {
    width: 24px;
    height: 24px;
  }

  .sidebar-icon-btn-small svg {
    width: 16px;
    height: 16px;
  }

  /* theme icons: show the one for the theme you'd switch TO */
  .theme-icon-sun { display: none; }
  :global([data-theme="dark"]) .theme-icon-sun { display: block; }
  :global([data-theme="dark"]) .theme-icon-moon { display: none; }

  .sidebar-search {
    padding: 0.125rem 0;
    margin-bottom: 0.125rem;
  }

  .sidebar-search-inner {
    position: relative;
    display: flex;
    align-items: center;
  }

  .sidebar-search-icon {
    position: absolute;
    left: 0.375rem;
    width: 16px;
    height: 16px;
    color: hsl(var(--sidebar-foreground) / 0.4);
    pointer-events: none;
    z-index: 1;
  }

  .sidebar-search-input {
    padding-left: 1.75rem !important;
    height: 32px;
    font-size: 0.8125rem;
  }

  .sidebar-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.25rem 0.5rem;
    border: none;
    border-radius: 0.375rem;
    background: transparent;
    color: hsl(var(--sidebar-foreground));
    cursor: pointer;
    font-size: 0.8125rem;
    text-align: left;
    line-height: 24px;
  }

  .sidebar-row:hover {
    background-color: hsl(var(--sidebar-accent));
  }

  .sidebar-row-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    color: hsl(var(--sidebar-foreground) / 0.6);
  }

  .sidebar-row-nested {
    padding-left: 2.75rem;
  }

  .sidebar-row-end {
    margin-left: auto;
    display: flex;
    align-items: center;
  }

  .sidebar-divider {
    height: 1px;
    margin: 0.25rem 0.5rem;
    background-color: hsl(var(--sidebar-border));
  }

  .sidebar-org-section {
    padding: 0.125rem 0;
  }

  .sidebar-org-section-inner {
    padding: 0;
  }

  .sidebar-starred-section {
    display: flex;
    flex-direction: column;
  }

  .sidebar-starred-header {
    display: flex;
    align-items: center;
  }

  .sidebar-starred-toggle {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border: none;
    border-radius: 0.375rem;
    background: transparent;
    color: hsl(var(--sidebar-foreground));
    cursor: pointer;
    font-size: 0.8125rem;
    line-height: 24px;
    text-align: left;
    width: 100%;
  }

  .sidebar-starred-toggle:hover {
    background-color: hsl(var(--sidebar-accent));
  }

  .sidebar-starred-chevron {
    flex-shrink: 0;
    color: hsl(var(--sidebar-foreground) / 0.6);
    transition: transform 0.15s;
  }

  .sidebar-starred-chevron-open {
    transform: rotate(0deg);
  }

  .sidebar-starred-label {
    font-weight: 500;
  }

  .sidebar-starred-items {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .sidebar-starred-empty {
    padding: 0.25rem 0.5rem;
    padding-left: 2.75rem;
    font-size: 0.8125rem;
    color: hsl(var(--muted-foreground));
    font-style: italic;
  }

  .sidebar-badge {
    margin-left: auto;
    background-color: hsl(var(--sidebar-accent));
    color: hsl(var(--sidebar-foreground));
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.125rem 0.375rem;
    border-radius: 0.75rem;
    line-height: 1.2;
  }

  .sidebar-trash-row {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .sidebar-trash-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .avatar-sm {
    width: 24px !important;
    height: 24px !important;
    flex-shrink: 0;
  }

  .avatar-sm-fallback {
    width: 24px !important;
    height: 24px !important;
    font-size: 10px !important;
  }

  /* Figma-style user menu */
  .menu-user-header {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.5rem;
  }

  :global(.menu-user-avatar) {
    width: 40px !important;
    height: 40px !important;
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

  .menu-lead-icon {
    width: 16px;
    height: 16px;
    margin-right: 0.5rem;
    flex-shrink: 0;
    color: hsl(var(--muted-foreground));
  }
</style>
