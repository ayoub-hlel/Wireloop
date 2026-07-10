<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import authStore from "../../stores/auth.store";

  let token = $state("");
  let password = $state("");
  let confirm = $state("");
  let error = $state("");
  let submitting = $state(false);
  let done = $state(false);

  $effect(() => {
    const t = $page.url.searchParams.get("token");
    if (t) token = t;
  });

  async function handleReset() {
    error = "";
    if (password !== confirm) {
      error = "Passwords do not match";
      return;
    }
    if (password.length < 8) {
      error = "Password must be at least 8 characters";
      return;
    }
    submitting = true;
    try {
      await authStore.resetPassword(token, password);
      done = true;
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : "Password reset failed";
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>Wireloop — Set New Password</title>
</svelte:head>

<nav class="fixed top-0 left-0 right-0 z-50 h-14 bg-surface border-b border-border flex items-center px-6">
  <a href="/" class="flex items-center gap-2 no-underline">
    <img src="/LOGO%20-%20Inversed.svg" alt="Wireloop" class="h-8 w-auto brightness-110" />
  </a>
</nav>

<div class="min-h-screen flex items-center justify-center px-4 pt-14 bg-background">
  <Card.Root class="w-full max-w-sm">
    <Card.Header>
      <Card.Title class="text-center">Set New Password</Card.Title>
      <Card.Description class="text-center">
        {done ? "Password updated" : "Enter your new password"}
      </Card.Description>
    </Card.Header>
    <Card.Content>
      {#if error}
        <div class="mb-4 p-3 rounded-md text-sm bg-destructive/10 border border-destructive/30 text-destructive">
          {error}
        </div>
      {/if}

      {#if !token && !done}
        <p class="text-sm text-muted-foreground text-center">
          Invalid or missing reset token. Please request a new password reset link.
        </p>
      {:else if done}
        <div class="flex flex-col gap-4 text-center">
          <div class="flex justify-center">
            <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <svg class="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <p class="text-sm text-muted-foreground">
            Your password has been reset successfully.
          </p>
          <Button class="w-full" onclick={() => goto("/login")}>
            Sign in with new password
          </Button>
        </div>
      {:else}
        <form onsubmit={(e) => { e.preventDefault(); handleReset(); }} class="flex flex-col gap-4">
          <div class="grid gap-2">
            <Label for="password">New Password</Label>
            <Input id="password" type="password" placeholder="••••••••" bind:value={password} required />
          </div>
          <div class="grid gap-2">
            <Label for="confirm">Confirm Password</Label>
            <Input id="confirm" type="password" placeholder="••••••••" bind:value={confirm} required />
          </div>
          <Button type="submit" class="w-full" disabled={submitting}>
            {submitting ? "Resetting…" : "Reset Password"}
          </Button>
        </form>
      {/if}
    </Card.Content>
  </Card.Root>
</div>
