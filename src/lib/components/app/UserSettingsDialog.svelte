<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import Toggle from "$lib/components/ui/toggle/toggle.svelte";
  import authStore from "../../../stores/auth.store";
  import { authClient } from "$lib/client/auth-client";
  import { getApiClient } from "../../../stores/api.client";
  import { onErrorMessage } from "../../../help/alerts";
  import { setTheme as applyTheme, getTheme } from "$lib/theme";

  // ponytail: single Account tab only — Figma's Community/Notifications/Security
  // tabs have no backing features yet; add tabs when one does.
  let { open = $bindable(false) }: { open: boolean } = $props();

  let uid = $state("");
  let name = $state("");
  let email = $state("");
  let image = $state<string | null>(null);

  let username = $state("");
  let bio = $state("");

  let editingName = $state(false);
  let nameDraft = $state("");
  let saving = $state(false);

  let theme = $state<"light" | "dark">("light");

  authStore.subscribe((auth) => {
    uid = auth.uid ?? "";
    name = auth.user?.name ?? "";
    email = auth.user?.email ?? "";
    image = auth.user?.image ?? null;
  });

  // Load profile + current theme each time the dialog opens
  $effect(() => {
    if (!open) return;
    theme = getTheme();
    if (!uid) return;
    getApiClient()
      .query("users:getUserProfile", { userId: uid })
      .then((p) => {
        const profile = p as { username?: string; bio?: string } | null;
        username = profile?.username ?? "";
        bio = profile?.bio ?? "";
      })
      .catch(() => {});
  });

  function getInitials(n: string): string {
    return n.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  }

  async function saveName() {
    const value = nameDraft.trim();
    if (!value) return;
    saving = true;
    try {
      await authClient.updateUser({ name: value });
      await authStore.init();
      editingName = false;
    } catch (e) {
      onErrorMessage("Could not update name.", e);
    } finally {
      saving = false;
    }
  }

  async function saveProfile() {
    saving = true;
    try {
      await getApiClient().mutation("users:updateUserProfile", { username, bio });
    } catch (e) {
      onErrorMessage("Could not update profile.", e);
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
      await authStore.init();
    } catch (err) {
      onErrorMessage("Could not upload avatar.", err);
    } finally {
      saving = false;
    }
  }

  function onThemeChange(value: string) {
    theme = value === "dark" ? "dark" : "light";
    applyTheme(theme);
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="user-settings-dialog sm:max-w-2xl">
    <Dialog.Header>
      <Dialog.Title>Settings</Dialog.Title>
    </Dialog.Header>

    <div class="settings-body">
      <div class="settings-avatar-col">
        <Avatar.Root class="settings-avatar">
          {#if image}
            <Avatar.Image src={image} alt={name} />
          {/if}
          <Avatar.Fallback>{getInitials(name || "?")}</Avatar.Fallback>
        </Avatar.Root>
        <label for="avatar-upload" class="avatar-edit-label">
          <Button variant="ghost" size="sm" disabled={saving} onclick={() => document.getElementById("avatar-upload")?.click()}>Edit</Button>
        </label>
        <input id="avatar-upload" type="file" accept="image/jpeg,image/png,image/webp" class="avatar-file-input" onchange={uploadAvatar} />
      </div>

      <div class="settings-rows">
        <section class="settings-section">
          <h3 class="settings-heading">Name</h3>
          {#if editingName}
            <div class="settings-inline-edit">
              <Input bind:value={nameDraft} placeholder="Your name" />
              <Button size="sm" disabled={saving} onclick={saveName}>Save</Button>
              <Button size="sm" variant="ghost" onclick={() => (editingName = false)}>Cancel</Button>
            </div>
          {:else}
            <div class="settings-value">{name}</div>
            <button class="settings-link" onclick={() => { nameDraft = name; editingName = true; }}>Change name</button>
          {/if}

          <h3 class="settings-heading">Email</h3>
          <div class="settings-value">{email}</div>
        </section>

        <section class="settings-section">
          <h3 class="settings-heading">Username</h3>
          <Input bind:value={username} placeholder="username" />
          <h3 class="settings-heading">Bio</h3>
          <Textarea bind:value={bio} rows={3} placeholder="Tell us about yourself" />
          <div class="settings-actions">
            <Button size="sm" disabled={saving} onclick={saveProfile}>Save profile</Button>
          </div>
        </section>

        <section class="settings-section">
          <h3 class="settings-heading">Theme</h3>
          <div class="theme-options" role="radiogroup" aria-label="Theme">
            <Toggle pressed={theme === 'dark'} onclick={() => onThemeChange('dark')} aria-label="Dark theme">Dark</Toggle>
            <Toggle pressed={theme === 'light'} onclick={() => onThemeChange('light')} aria-label="Light theme">Light</Toggle>
          </div>
        </section>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>

<style>
  .settings-body {
    display: flex;
    gap: 1.5rem;
    min-height: 280px;
  }

  .settings-avatar-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  :global(.settings-avatar) {
    width: 120px !important;
    height: 120px !important;
    font-size: 2rem !important;
  }

  .avatar-file-input {
    display: none;
  }

  .settings-rows {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .settings-section {
    padding: 0.75rem 0;
    border-bottom: 1px solid hsl(var(--border));
  }

  .settings-section:last-child {
    border-bottom: none;
  }

  .settings-heading {
    font-size: 0.875rem;
    font-weight: 600;
    margin: 0.5rem 0 0.25rem;
    color: hsl(var(--foreground));
  }

  .settings-heading:first-child {
    margin-top: 0;
  }

  .settings-value {
    font-size: 0.8125rem;
    color: hsl(var(--muted-foreground));
  }

  .settings-link {
    background: none;
    border: none;
    padding: 0;
    font-size: 0.8125rem;
    color: hsl(var(--primary));
    cursor: pointer;
    text-align: left;
  }

  .settings-link:hover {
    text-decoration: underline;
  }

  .settings-inline-edit {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .settings-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 0.5rem;
  }

  .theme-options {
    display: flex;
    gap: 0.375rem;
  }
</style>
