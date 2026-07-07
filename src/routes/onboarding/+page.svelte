<script lang="ts">
  import { goto } from "$app/navigation";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import authStore from "../../stores/auth.store";

  let email = $state("");
  let password = $state("");
  let username = $state("");
  let bio = $state("");
  let avatarFile = $state<File | null>(null);
  let avatarPreview = $state("");
  let error = $state("");
  let submitting = $state(false);
  let done = $state(false);

  const canSubmit = $derived(!submitting && !done && username.trim().length > 0);

  $effect(() => {
    const raw = sessionStorage.getItem("pendingSignup");
    if (!raw) {
      goto("/login", { replaceState: true });
      return;
    }
    try {
      const data = JSON.parse(raw);
      email = data.email ?? "";
      password = data.password ?? "";
      username = data.username ?? "";
    } catch {
      goto("/login", { replaceState: true });
    }
  });

  function handleAvatarChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      avatarFile = file;
      avatarPreview = URL.createObjectURL(file);
    }
  }

  async function completeSignup() {
    error = "";
    submitting = true;
    try {
      // Step 1: Create Better Auth user — this is the first DB write
      await authStore.signUp(email, password, username);

      let profileImageUrl = "";

      // Step 2: Upload avatar (user now exists in DB, we have a userId)
      if (avatarFile) {
        const formData = new FormData();
        formData.append("avatar", avatarFile);
        const uploadRes = await fetch("/api/upload/avatar", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Avatar upload failed");
        const { url } = await uploadRes.json();
        profileImageUrl = url;
      }

      // Step 3: Create profile row (username, bio, profileImage)
      const res = await fetch("/api/mutation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "users:updateUserProfile",
          args: {
            username,
            bio: bio || undefined,
            profileImage: profileImageUrl || undefined,
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to save profile");

      sessionStorage.removeItem("pendingSignup");
      done = true;
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : "Something went wrong";
    } finally {
      submitting = false;
    }
  }

  async function goToStudio() {
    await goto("/studio");
  }
</script>

<svelte:head>
  <title>Wireloop — Set Up Profile</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center px-4 bg-background">
  <Card.Root class="w-full max-w-sm">
    <Card.Header>
      {#if done}
        <Card.Title class="text-center">You're signed up!</Card.Title>
        <Card.Description class="text-center">Your account is ready. You can start building.</Card.Description>
      {:else}
        <Card.Title class="text-center">Set Up Your Profile</Card.Title>
        <Card.Description class="text-center">Add a profile picture and bio to personalize your account.</Card.Description>
      {/if}
    </Card.Header>
    <Card.Content>
      {#if error}
        <div class="mb-4 p-3 rounded-md text-sm bg-destructive/10 border border-destructive/30 text-destructive">
          {error}
        </div>
      {/if}

      {#if done}
        <div class="flex flex-col gap-4">
          <p class="text-sm text-muted-foreground text-center">You're signed in and ready to go.</p>
          <Button class="w-full" onclick={goToStudio}>Go to Studio</Button>
        </div>
      {:else}
        <form onsubmit={(e) => { e.preventDefault(); completeSignup(); }} class="flex flex-col gap-4">
          <div class="flex flex-col items-center gap-3">
            <label for="avatar-upload" class="cursor-pointer">
              <div class="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border hover:border-primary transition-colors">
                {#if avatarPreview}
                  <img src={avatarPreview} alt="Avatar" class="w-full h-full object-cover" />
                {:else}
                  <svg class="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                {/if}
              </div>
            </label>
            <input id="avatar-upload" type="file" accept="image/*" class="hidden" onchange={handleAvatarChange} />
            <span class="text-xs text-muted-foreground">Click to add profile picture (optional)</span>
          </div>

          <div class="grid gap-2">
            <Label for="onboarding-email">Email</Label>
            <Input id="onboarding-email" type="email" value={email} disabled class="bg-muted" />
          </div>

          <div class="grid gap-2">
            <Label for="onboarding-username">Username</Label>
            <Input id="onboarding-username" type="text" bind:value={username} placeholder="Choose a username" required />
          </div>

          <div class="grid gap-2">
            <Label for="onboarding-bio">Bio</Label>
            <textarea id="onboarding-bio" placeholder="Tell us about yourself..." bind:value={bio} rows={3} class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"></textarea>
          </div>

          <Button type="submit" class="w-full" disabled={!canSubmit}>
            {submitting ? "Creating account..." : "Complete Setup"}
          </Button>
          <Button variant="ghost" class="w-full" onclick={completeSignup} disabled={!canSubmit}>Skip for now</Button>
        </form>
      {/if}
    </Card.Content>
  </Card.Root>
</div>
