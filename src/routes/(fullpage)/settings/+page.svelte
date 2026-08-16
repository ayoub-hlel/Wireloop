<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import * as Tabs from '$lib/components/ui/tabs/index.js';
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import User from '@lucide/svelte/icons/user';
  import Bell from '@lucide/svelte/icons/bell';
  import Shield from '@lucide/svelte/icons/shield';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import authStore from "../../../stores/auth.store";
  import { authClient } from "$lib/client/auth-client";
  import { onErrorMessage, onSuccess } from "../../../help/alerts";
  import { setTheme as applyTheme, getTheme } from "$lib/theme";

  let name = $state("");
  let email = $state("");
  let image = $state<string | null>(null);

  let editingName = $state(false);
  let nameDraft = $state("");
  let saving = $state(false);

  let theme = $state<"light" | "dark">("light");
  let activeTab = $state("personal");

  let currentPassword = $state("");
  let newPassword = $state("");
  let confirmPassword = $state("");
  let showPassword = $state(false);
  let changingPassword = $state(false);
  let passwordError = $state("");

  let showDeleteNote = $state(false);
  let show2FANote = $state(false);

  authStore.subscribe((auth) => {
    name = auth.user?.name ?? "";
    email = auth.user?.email ?? "";
    image = auth.user?.image ?? null;
  });

  onMount(() => {
    theme = getTheme();
  });

  function getInitials(n: string): string {
    return n.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  }

  function onThemeChange(value: string) {
    theme = value === "dark" ? "dark" : "light";
    applyTheme(theme);
  }

  async function saveName() {
    const value = nameDraft.trim();
    if (!value) return;
    saving = true;
    try {
      await authClient.updateUser({ name: value });
      await authStore.init(true);
      editingName = false;
      onSuccess("Name updated");
    } catch (e) {
      onErrorMessage("Could not update name", e);
    } finally {
      saving = false;
    }
  }

  async function uploadAvatar(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const data = new FormData();
    data.set("avatar", file);
    saving = true;
    try {
      const res = await fetch("/api/upload/avatar", { method: "POST", body: data });
      if (!res.ok) throw new Error(await res.text());
      const { url } = (await res.json()) as { url: string };
      await authClient.updateUser({ image: url });
      await authStore.init(true);
    } catch (err) {
      onErrorMessage("Could not upload avatar", err);
    } finally {
      saving = false;
    }
  }

  async function changePassword() {
    passwordError = "";
    if (newPassword.length < 8) { passwordError = "Password must be at least 8 characters"; return; }
    if (newPassword !== confirmPassword) { passwordError = "Passwords do not match"; return; }
    if (!currentPassword) { passwordError = "Current password required"; return; }
    changingPassword = true;
    try {
      await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: false });
      onSuccess("Password changed");
      currentPassword = "";
      newPassword = "";
      confirmPassword = "";
    } catch {
      passwordError = "Could not change password. Check your current password.";
    } finally {
      changingPassword = false;
    }
  }

  // ── Notification preferences (UI only; no backend yet) ──────────────
  const NOTIF_OPTIONS = [
    { key: "project_activity", label: "Project activity", description: "When someone creates, edits, or deletes a shared project." },
    { key: "invitations", label: "Invitations", description: "When you're invited to an organization or project." },
    { key: "product_updates", label: "Product updates", description: "New features and improvements to Wireloop." },
    { key: "marketing", label: "Marketing emails", description: "Occasional news and offers from the Wireloop team." },
  ] as const;

  type NotifKey = (typeof NOTIF_OPTIONS)[number]["key"];

  function loadNotifPrefs(): Record<NotifKey, boolean> {
    const defaults: Record<NotifKey, boolean> = {
      project_activity: true,
      invitations: true,
      product_updates: true,
      marketing: false,
    };
    if (typeof localStorage === "undefined") return defaults;
    try {
      const raw = localStorage.getItem("wireloop_notif_prefs");
      return raw ? { ...defaults, ...(JSON.parse(raw) as Partial<Record<NotifKey, boolean>>) } : defaults;
    } catch {
      return defaults;
    }
  }

  let notifPrefs = $state<Record<NotifKey, boolean>>(loadNotifPrefs());

  function toggleNotif(key: NotifKey) {
    notifPrefs[key] = !notifPrefs[key];
    try {
      localStorage.setItem("wireloop_notif_prefs", JSON.stringify(notifPrefs));
    } catch { /* non-fatal */ }
  }
</script>

<svelte:head>
  <title>Wireloop - Settings</title>
</svelte:head>

<div class="settings-page">
  <header class="settings-header">
    <button class="back-link" onclick={() => goto("/projects")} aria-label="Back to projects">
      <ArrowLeft size={16} />
      <span>Projects</span>
    </button>
    <h1 class="settings-title">Settings</h1>
    <p class="settings-subtitle">Manage your account, notifications, and security.</p>
  </header>

  <Tabs.Root value={activeTab} class="settings-tabs">
    <Tabs.List variant="line" class="settings-tab-list">
      <Tabs.Trigger value="personal">Personal</Tabs.Trigger>
      <Tabs.Trigger value="notifications">Notifications</Tabs.Trigger>
      <Tabs.Trigger value="security">Security</Tabs.Trigger>
    </Tabs.List>

    <!-- ── Personal ─────────────────────────────────────────────── -->
    <Tabs.Content value="personal" class="settings-content">
      <section class="settings-card">
        <div class="profile-row">
          <Avatar.Root class="settings-avatar">
            {#if image}
              <Avatar.Image src={image} alt={name} />
            {/if}
            <Avatar.Fallback>{getInitials(name || "?")}</Avatar.Fallback>
          </Avatar.Root>
          <div class="profile-info">
            <div class="profile-name">{name || "User"}</div>
            <div class="profile-email">{email}</div>
          </div>
          <label class="avatar-edit-label">
            <Button variant="outline" size="sm" disabled={saving} onclick={() => document.getElementById("avatar-upload")?.click()}>
              Change photo
            </Button>
          </label>
          <input id="avatar-upload" type="file" accept="image/jpeg,image/png,image/webp" class="avatar-file-input" onchange={uploadAvatar} />
        </div>
      </section>

      <section class="settings-card">
        <div class="card-title">
          <User size={15} />
          <span>Name</span>
        </div>
        {#if editingName}
          <div class="inline-edit">
            <Input bind:value={nameDraft} placeholder="Your name" aria-label="Name" />
            <Button size="sm" disabled={saving || !nameDraft.trim()} onclick={saveName}>Save</Button>
            <Button size="sm" variant="ghost" onclick={() => (editingName = false)}>Cancel</Button>
          </div>
        {:else}
          <div class="card-value">{name || "User"}</div>
          <button class="card-link" onclick={() => { nameDraft = name; editingName = true; }}>Change name</button>
        {/if}
      </section>

      <section class="settings-card">
        <div class="card-title">
          <Bell size={15} />
          <span>Email</span>
        </div>
        <div class="card-value">{email}</div>
      </section>

      <section class="settings-card">
        <div class="card-title">Theme</div>
        <div class="theme-options" role="radiogroup" aria-label="Theme">
          <button class="theme-option" class:active={theme === 'light'} onclick={() => onThemeChange('light')} aria-label="Light theme">
            <span class="theme-swatch theme-swatch-light"></span>
            <span>Light</span>
          </button>
          <button class="theme-option" class:active={theme === 'dark'} onclick={() => onThemeChange('dark')} aria-label="Dark theme">
            <span class="theme-swatch theme-swatch-dark"></span>
            <span>Dark</span>
          </button>
        </div>
      </section>

      <section class="settings-card settings-card-danger">
        <div class="card-title card-title-danger">
          <Trash2 size={15} />
          <span>Account</span>
        </div>
        <p class="card-description">
          Permanently delete your account and all your projects. This can't be undone.
        </p>
        <div class="danger-row">
          <Button variant="outline" size="sm" class="danger-btn" onclick={() => (showDeleteNote = !showDeleteNote)}>
            Delete account
          </Button>
        </div>
        {#if showDeleteNote}
          <p class="coming-soon">
            Account deletion isn't available yet — we'll let you know when it is.
          </p>
        {/if}
      </section>
    </Tabs.Content>

    <!-- ── Notifications ───────────────────────────────────────── -->
    <Tabs.Content value="notifications" class="settings-content">
      <section class="settings-card">
        <div class="card-title">Email notifications</div>
        <div class="switch-list">
          {#each NOTIF_OPTIONS as opt (opt.key)}
            <div class="switch-row">
              <div class="switch-info">
                <div class="switch-label">{opt.label}</div>
                <div class="switch-description">{opt.description}</div>
              </div>
              <button
                role="switch"
                aria-checked={notifPrefs[opt.key]}
                aria-label={opt.label}
                class="switch"
                class:on={notifPrefs[opt.key]}
                onclick={() => toggleNotif(opt.key)}
              >
                <span class="switch-thumb"></span>
              </button>
            </div>
          {/each}
        </div>
      </section>

      <section class="settings-card">
        <div class="card-description">
          You can unsubscribe from Wireloop emails any time. For more information, review our <a class="privacy-link" href="/privacy">Privacy Policy</a>.
        </div>
      </section>
    </Tabs.Content>

    <!-- ── Security ─────────────────────────────────────────────── -->
    <Tabs.Content value="security" class="settings-content">
      <section class="settings-card">
        <div class="card-title">Change password</div>
        <div class="settings-field">
          <Label for="current-pw">Current password</Label>
          <div class="password-input-wrapper">
            <Input id="current-pw" type={showPassword ? "text" : "password"} bind:value={currentPassword} />
            <button type="button" class="password-toggle" aria-label="Toggle password visibility" onclick={() => showPassword = !showPassword}>
              {#if showPassword}
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6m0 7a4 4 0 1 1 0-8 4 4 0 0 1 0 8m0-11C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7"/></svg>
              {:else}
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M2.707 1.293a1 1 0 0 0-1.414 1.414l3.22 3.22C2.64 7.24 1.24 9.07 1 12c1.73 3.89 6 7 11 7 1.8 0 3.5-.42 5-1.16l3.293 3.293a1 1 0 0 0 1.414-1.414zM12 17c-3.33 0-6.36-1.73-8-4.5.9-1.5 2.3-2.7 4-3.4l1.6 1.6a3 3 0 0 0 4.1 4.1l1.3 1.3c-.9.4-1.9.6-3 .6m9.7-4.5c-.44-.73-1.02-1.4-1.7-2l-3.6 3.6c.3.6.5 1.3.5 2 .7-.7 1.3-1.5 1.8-2.4z"/></svg>
              {/if}
            </button>
          </div>
        </div>
        <div class="settings-field">
          <Label for="new-pw">New password</Label>
          <Input id="new-pw" type={showPassword ? "text" : "password"} bind:value={newPassword} />
        </div>
        <div class="settings-field">
          <Label for="confirm-pw">Confirm new password</Label>
          <Input id="confirm-pw" type={showPassword ? "text" : "password"} bind:value={confirmPassword} />
        </div>
        {#if passwordError}<p class="field-error">{passwordError}</p>{/if}
        <div class="settings-actions">
          <Button size="sm" disabled={changingPassword || newPassword.length < 8 || !currentPassword || newPassword !== confirmPassword} onclick={changePassword}>
            {changingPassword ? 'Changing...' : 'Change password'}
          </Button>
        </div>
      </section>

      <section class="settings-card">
        <div class="card-title">
          <Shield size={15} />
          <span>Two-factor authentication</span>
        </div>
        <p class="card-description">
          Add an extra layer of security to your account with an authenticator app.
        </p>
        <div class="danger-row">
          <Button variant="outline" size="sm" onclick={() => (show2FANote = !show2FANote)}>
            Enable two-factor authentication
          </Button>
        </div>
        {#if show2FANote}
          <p class="coming-soon">
            Two-factor authentication is coming soon — we'll let you know when you can enable it.
          </p>
        {/if}
      </section>
    </Tabs.Content>
  </Tabs.Root>
</div>

<style>
  .settings-page {
    max-width: 640px;
    margin: 0 auto;
    padding: 1.5rem 1rem 3rem;
    min-height: 100vh;
  }

  .settings-header {
    margin-bottom: 1.5rem;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0;
    border: none;
    background: transparent;
    color: hsl(var(--muted-foreground));
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: color 150ms;
  }

  .back-link:hover {
    color: hsl(var(--foreground));
  }

  .back-link:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
    border-radius: 4px;
  }

  .settings-title {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0.5rem 0 0.25rem;
    color: hsl(var(--foreground));
    letter-spacing: -0.03em;
  }

  .settings-subtitle {
    margin: 0;
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
  }

  .settings-tabs {
    margin-top: 0.25rem;
  }

  .settings-tab-list {
    width: 100%;
  }

  .settings-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .settings-card {
    padding: 1rem 1rem 1.125rem;
    background-color: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
  }

  .settings-card-danger {
    border-color: hsla(var(--destructive) / 0.25);
  }

  .card-title {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    font-weight: 600;
    color: hsl(var(--foreground));
    margin-bottom: 0.75rem;
  }

  .card-title-danger {
    color: hsl(var(--destructive));
  }

  .card-value {
    font-size: 0.9375rem;
    color: hsl(var(--foreground));
  }

  .card-description {
    margin: 0 0 0.875rem;
    font-size: 0.8125rem;
    line-height: 1.5;
    color: hsl(var(--muted-foreground));
  }

  .card-link {
    background: none;
    border: none;
    padding: 0;
    margin-top: 0.375rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: hsl(var(--accent));
    cursor: pointer;
    transition: color 150ms;
  }

  .card-link:hover {
    color: hsl(var(--accent) / 0.8);
  }

  .card-link:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
    border-radius: 4px;
  }

  .inline-edit {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .inline-edit :global(input) {
    flex: 1;
  }

  .profile-row {
    display: flex;
    align-items: center;
    gap: 0.875rem;
  }

  :global(.settings-avatar) {
    width: 64px !important;
    height: 64px !important;
    font-size: 1.25rem !important;
    flex-shrink: 0;
  }

  .profile-info {
    flex: 1;
    min-width: 0;
  }

  .profile-name {
    font-size: 0.9375rem;
    font-weight: 600;
    color: hsl(var(--foreground));
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .profile-email {
    font-size: 0.75rem;
    color: hsl(var(--muted-foreground));
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .avatar-file-input {
    display: none;
  }

  .theme-options {
    display: flex;
    gap: 0.5rem;
  }

  .theme-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    padding: 0.625rem 0.75rem;
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    background: transparent;
    color: hsl(var(--foreground));
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 150ms, border-color 150ms;
  }

  .theme-option:hover {
    background: hsl(var(--secondary));
  }

  .theme-option:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
  }

  .theme-option.active {
    border-color: hsl(var(--ring));
    background: hsl(var(--secondary));
  }

  .theme-swatch {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 1px solid hsl(var(--border));
  }

  .theme-swatch-light {
    background: #fff;
  }

  .theme-swatch-dark {
    background: #171717;
  }

  .danger-row {
    display: flex;
    justify-content: flex-start;
  }

  .danger-btn {
    color: hsl(var(--destructive));
    border-color: hsla(var(--destructive) / 0.35);
  }

  .coming-soon {
    margin: 0.75rem 0 0;
    font-size: 0.75rem;
    color: hsl(var(--muted-foreground));
  }

  .switch-list {
    display: flex;
    flex-direction: column;
  }

  .switch-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 0;
  }

  .switch-row + .switch-row {
    border-top: 1px solid hsl(var(--border));
  }

  .switch-info {
    flex: 1;
    min-width: 0;
  }

  .switch-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: hsl(var(--foreground));
  }

  .switch-description {
    font-size: 0.75rem;
    color: hsl(var(--muted-foreground));
    margin-top: 0.125rem;
  }

  .switch {
    position: relative;
    width: 40px;
    height: 24px;
    flex-shrink: 0;
    border-radius: 9999px;
    border: 1px solid hsl(var(--border));
    background: hsl(var(--secondary));
    cursor: pointer;
    transition: background 150ms, border-color 150ms;
    padding: 0;
  }

  .switch.on {
    background: hsl(var(--accent));
    border-color: hsl(var(--accent));
  }

  .switch:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
  }

  .switch-thumb {
    position: absolute;
    top: 50%;
    left: 2px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: hsl(var(--background));
    transform: translateY(-50%);
    transition: left 150ms ease;
  }

  .switch.on .switch-thumb {
    left: calc(100% - 20px);
  }

  .settings-field {
    margin-bottom: 0.875rem;
  }

  .settings-field :global(label) {
    display: block;
    font-size: 0.8125rem;
    margin-bottom: 0.375rem;
    color: hsl(var(--muted-foreground));
  }

  .settings-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 0.25rem;
  }

  .field-error {
    font-size: 0.75rem;
    color: hsl(var(--destructive));
    margin: 0.25rem 0 0.75rem;
  }

  .password-input-wrapper {
    position: relative;
  }

  .password-input-wrapper :global(input) {
    padding-right: 2.25rem;
  }

  .password-toggle {
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: hsl(var(--muted-foreground));
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: color 150ms;
  }

  .password-toggle:hover {
    color: hsl(var(--foreground));
  }

  .password-toggle:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
  }

  .privacy-link {
    color: hsl(var(--accent));
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .privacy-link:hover {
    color: hsl(var(--accent) / 0.8);
  }

  .privacy-link:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
    border-radius: 2px;
  }

  @media (max-width: 480px) {
    .settings-page {
      padding: 1.25rem 0.875rem 3rem;
    }
  }
</style>
