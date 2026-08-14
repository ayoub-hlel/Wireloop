<script lang="ts">
  import { onMount } from 'svelte';
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import authStore from "../../../stores/auth.store";
  import { authClient } from "$lib/client/auth-client";
  import { getApiClient } from "../../../stores/api.client";
  import { onErrorMessage, onSuccess } from "../../../help/alerts";
  import { setTheme as applyTheme, getTheme } from "$lib/theme";

  let uid = $state("");
  let name = $state("");
  let email = $state("");
  let image = $state<string | null>(null);
  let username = $state("");
  let bio = $state("");
  let location = $state("");
  let website = $state("");
  let isPublic = $state(false);
  let theme = $state<"light" | "dark">(getTheme());
  let saving = $state(false);
  let usernameError = $state("");

  let currentPassword = $state("");
  let newPassword = $state("");
  let confirmPassword = $state("");
  let showPassword = $state(false);
  let changingPassword = $state(false);
  let passwordError = $state("");

  authStore.subscribe((auth) => {
    uid = auth.uid ?? "";
    name = auth.user?.name ?? "";
    email = auth.user?.email ?? "";
    image = auth.user?.image ?? null;
  });

  onMount(() => {
    if (!uid) return;
    getApiClient().query("users:getUserProfile", { userId: uid }).then((p) => {
      const profile = p as { username?: string; bio?: string; location?: string; website?: string; isPublic?: boolean } | null;
      username = profile?.username ?? "";
      bio = profile?.bio ?? "";
      location = profile?.location ?? "";
      website = profile?.website ?? "";
      isPublic = profile?.isPublic ?? false;
    }).catch(() => {});
  });

  function getInitials(n: string): string {
    return n.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  }

  function onThemeChange(value: string) {
    theme = value === "dark" ? "dark" : "light";
    applyTheme(theme);
  }

  function validateUsername(value: string) {
    usernameError = "";
    if (!value) return;
    if (value.length < 2) { usernameError = "At least 2 characters"; return; }
    if (value.length > 30) { usernameError = "Max 30 characters"; return; }
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) { usernameError = "Letters, numbers, dash, underscore only"; }
  }

  async function saveProfile() {
    if (usernameError) return;
    saving = true;
    try {
      await getApiClient().mutation("users:updateUserProfile", { username, bio, location, website, isPublic });
      onSuccess("Profile updated");
    } catch (e: unknown) {
      const msg = String(e);
      if (msg.includes("unique") || msg.includes("23505")) {
        usernameError = "Username is taken";
      } else {
        onErrorMessage("Could not update profile", e);
      }
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
      // Deliberately generic: don't leak whether the current password or the
      // account state was the problem.
      passwordError = "Could not change password. Check your current password.";
    } finally {
      changingPassword = false;
    }
  }
</script>

<svelte:head>
  <title>Wireloop - Settings</title>
</svelte:head>

<div class="settings-page">
  <header class="settings-header">
    <h1 class="settings-title">Account Settings</h1>
  </header>

  <div class="settings-layout">
    <div class="settings-avatar-col">
      <Avatar.Root class="settings-avatar">
        {#if image}<Avatar.Image src={image} alt={name} />{/if}
        <Avatar.Fallback>{getInitials(name || "?")}</Avatar.Fallback>
      </Avatar.Root>
      <label for="avatar-upload" class="avatar-edit-label">
        <Button variant="ghost" size="sm" disabled={saving} onclick={() => document.getElementById("avatar-upload")?.click()}>Change photo</Button>
      </label>
      <input id="avatar-upload" type="file" accept="image/jpeg,image/png,image/webp" class="avatar-file-input" onchange={uploadAvatar} />
    </div>

    <div class="settings-content">
      <!-- Profile -->
      <section class="settings-section">
        <h3 class="settings-heading">Profile</h3>
        <div class="settings-field">
          <Label for="username">Username</Label>
          <Input id="username" bind:value={username} placeholder="username" oninput={(e) => validateUsername((e.target as HTMLInputElement).value)} />
          {#if usernameError}<p class="field-error">{usernameError}</p>{/if}
        </div>
        <div class="settings-field">
          <Label for="bio">Bio</Label>
          <Textarea id="bio" bind:value={bio} rows={3} placeholder="Tell us about yourself" />
        </div>
        <div class="settings-field">
          <Label for="location">Location</Label>
          <Input id="location" bind:value={location} placeholder="City, Country" />
        </div>
        <div class="settings-field">
          <Label for="website">Website</Label>
          <Input id="website" bind:value={website} placeholder="https://example.com" type="url" />
        </div>
        <div class="settings-field">
          <div class="toggle-row">
            <input type="checkbox" id="profile-public" bind:checked={isPublic} />
            <Label for="profile-public" class="toggle-label">Public profile (visible to everyone)</Label>
          </div>
        </div>
        <div class="settings-actions">
          <Button size="sm" disabled={saving || !!usernameError} onclick={saveProfile}>
            {saving ? 'Saving...' : 'Save profile'}
          </Button>
        </div>
      </section>

      <Separator />

      <!-- Security -->
      <section class="settings-section">
        <h3 class="settings-heading">Security</h3>
        <div class="settings-field">
          <Label>Email</Label>
          <p class="field-static">{email}</p>
        </div>
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

      <Separator />

      <!-- Appearance -->
      <section class="settings-section">
        <h3 class="settings-heading">Appearance</h3>
        <div class="theme-options" role="radiogroup" aria-label="Theme">
          <button class="theme-option" class:active={theme === 'light'} onclick={() => onThemeChange('light')} aria-label="Light theme">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12m0-14a1 1 0 0 1 1-1V1a1 1 0 1 0-2 0v2a1 1 0 0 1 1 1m0 16a1 1 0 0 1-1 1v2a1 1 0 1 0 2 0v-2a1 1 0 0 1-1-1m7.07-13.07a1 1 0 0 1-1.41-1.41l1.41-1.41a1 1 0 1 1 1.41 1.41zM5.34 18.66a1 1 0 0 1 1.41 1.41l-1.41 1.41a1 1 0 1 1-1.41-1.41zM22 11h-2a1 1 0 1 0 0 2h2a1 1 0 1 0 0-2zM2 13h2a1 1 0 1 0 0-2H2a1 1 0 1 0 0 2m16.66 5.34l1.41 1.41a1 1 0 1 1-1.41 1.41l-1.41-1.41a1 1 0 0 1 1.41-1.41M5.34 5.34L3.93 3.93a1 1 0 0 1 1.41-1.41l1.41 1.41a1 1 0 0 1-1.41 1.41"/></svg>
            <span>Light</span>
          </button>
          <button class="theme-option" class:active={theme === 'dark'} onclick={() => onThemeChange('dark')} aria-label="Dark theme">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1"/></svg>
            <span>Dark</span>
          </button>
        </div>
      </section>
    </div>
  </div>
</div>

<style>
  .settings-page { max-width: 680px; margin: 0 auto; padding: 2.5rem 1.5rem; }
  .settings-header { margin-bottom: 2.5rem; }
  .settings-title { font-size: 1.75rem; font-weight: 600; margin: 0; color: hsl(var(--foreground)); letter-spacing: -0.02em; }
  .settings-layout { display: flex; gap: 2.5rem; align-items: flex-start; }
  .settings-avatar-col { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; flex-shrink: 0; }
  :global(.settings-avatar) { width: 88px !important; height: 88px !important; font-size: 1.5rem !important; }
  .avatar-edit-label { margin-top: 0.25rem; }
  .avatar-file-input { display: none; }
  .settings-content { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  .settings-section { padding: 1.5rem 0; }
  .settings-heading { font-size: 0.8125rem; font-weight: 600; margin: 0 0 1rem; color: hsl(var(--foreground)); letter-spacing: 0.01em; }
  .settings-field { margin-bottom: 1rem; }
  .settings-field :global(label) { display: block; font-size: 0.8125rem; margin-bottom: 0.375rem; color: hsl(var(--muted-foreground)); }
  .settings-actions { display: flex; justify-content: flex-end; margin-top: 0.75rem; }
  .field-error { font-size: 0.75rem; color: hsl(var(--destructive)); margin: 0.25rem 0 0; }
  .field-static { font-size: 0.875rem; color: hsl(var(--foreground)); padding: 0.5rem 0; margin: 0; }
  .password-input-wrapper { position: relative; }
  .password-input-wrapper :global(input) { padding-right: 2.25rem; }
  .password-toggle { position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%); background: none; border: none; color: hsl(var(--muted-foreground)); cursor: pointer; padding: 0.25rem; border-radius: 0.25rem; transition: color 150ms; }
  .password-toggle:hover { color: hsl(var(--foreground)); }
  .password-toggle:focus-visible { outline: 2px solid hsl(var(--ring)); outline-offset: 2px; }
  .toggle-row { display: flex; align-items: center; gap: 0.5rem; }
  .toggle-row input[type="checkbox"] { width: 1rem; height: 1rem; accent-color: hsl(var(--primary)); cursor: pointer; }
  .toggle-label { margin-bottom: 0 !important; cursor: pointer; }
  .theme-options { display: flex; gap: 0.375rem; }
  .theme-option { display: flex; align-items: center; gap: 0.375rem; padding: 0.375rem 0.75rem; border: 1px solid hsl(var(--border)); border-radius: var(--radius); background: transparent; color: hsl(var(--foreground)); font-size: 0.8125rem; cursor: pointer; transition: background 150ms, border-color 150ms; }
  .theme-option:hover { background: hsl(var(--secondary)); }
  .theme-option:focus-visible { outline: 2px solid hsl(var(--ring)); outline-offset: 2px; }
  .theme-option.active { border-color: hsl(var(--ring)); background: hsl(var(--secondary)); }

  @media (max-width: 640px) {
    .settings-layout {
      flex-direction: column;
      align-items: center;
      gap: 1.5rem;
    }
    .settings-content {
      width: 100%;
    }
  }
</style>
