<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { authClient } from "$lib/client/auth-client";

  let username = $state("");
  let bio = $state("");
  let avatarFile = $state<File | null>(null);
  let avatarPreview = $state("");
  let error = $state("");
  let submitting = $state(false);
  let done = $state(false);
  let loading = $state(true);
  let emailVerified = $state(false);
  let userEmail = $state("");
  let resendCooldown = $state(0);
  let resendLoading = $state(false);
  let resendSent = $state(false);

  const canSubmit = $derived(!submitting && !done && username.trim().length > 0);

  onMount(async () => {
    try {
      const { data } = await authClient.getSession();
      if (!data) {
        goto("/login", { replaceState: true });
        return;
      }
      userEmail = data.user.email;
      emailVerified = data.user.emailVerified;
      username = data.user.name ?? "";
    } catch {
      goto("/login", { replaceState: true });
    } finally {
      loading = false;
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

  async function completeProfile() {
    error = "";
    submitting = true;
    try {
      let profileImageUrl = "";

      if (avatarFile) {
        const formData = new FormData();
        formData.append("avatar", avatarFile);
        const uploadRes = await fetch("/api/upload/avatar", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Avatar upload failed");
        const { url } = (await uploadRes.json()) as { url: string };
        profileImageUrl = url;
      }

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

      done = true;
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : "Something went wrong";
    } finally {
      submitting = false;
    }
  }

  async function handleResend() {
    resendLoading = true;
    error = "";
    try {
      await authClient.sendVerificationEmail({
        email: userEmail,
        callbackURL: "/onboarding",
      });
      resendSent = true;
      resendCooldown = 60;
      const interval = setInterval(() => {
        resendCooldown--;
        if (resendCooldown <= 0) clearInterval(interval);
      }, 1000);
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : "Failed to resend";
    } finally {
      resendLoading = false;
    }
  }

  async function goToProjects() {
    await goto("/projects");
  }
</script>

<svelte:head>
  <title>Wireloop — Set Up Profile</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center px-4 bg-background">
  <Card.Root class="w-full max-w-sm">
    <Card.Header>
      {#if loading}
        <Card.Title class="text-center">Loading...</Card.Title>
      {:else if !emailVerified}
        <Card.Title class="text-center">Verify Your Email</Card.Title>
        <Card.Description class="text-center">Check your email to continue</Card.Description>
      {:else if done}
        <Card.Title class="text-center">You're all set!</Card.Title>
        <Card.Description class="text-center">Your profile is ready. Start building.</Card.Description>
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

      {#if loading}
        <div class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      {:else if !emailVerified}
        <div class="flex flex-col gap-4 text-center">
          <div class="flex justify-center">
            <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <svg class="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p class="text-sm text-muted-foreground">
            We sent a verification email to <strong>{userEmail}</strong>.
            Click the link in the email to verify your account.
          </p>
          {#if resendSent}
            <p class="text-xs text-primary">A new verification email has been sent.</p>
          {/if}
          <Button
            variant="outline"
            class="w-full"
            onclick={handleResend}
            disabled={resendCooldown > 0 || resendLoading}
          >
            {resendLoading ? "Sending..." : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend verification email"}
          </Button>
        </div>
      {:else if done}
        <div class="flex flex-col gap-4">
          <p class="text-sm text-muted-foreground text-center">Your account is ready. Start building.</p>
          <Button class="w-full" onclick={goToProjects}>Get Started</Button>
        </div>
      {:else}
        <form onsubmit={(e) => { e.preventDefault(); completeProfile(); }} class="flex flex-col gap-4">
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
            <Input id="onboarding-email" type="email" value={userEmail} disabled class="bg-muted" />
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
            {submitting ? "Saving..." : "Complete Setup"}
          </Button>
          <Button variant="ghost" class="w-full" onclick={completeProfile} disabled={!canSubmit}>Skip for now</Button>
        </form>
      {/if}
    </Card.Content>
  </Card.Root>
</div>
