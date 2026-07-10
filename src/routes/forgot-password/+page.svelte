<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import authStore from "../../stores/auth.store";

  let email = $state("");
  let error = $state("");
  let submitting = $state(false);
  let sent = $state(false);
</script>

<svelte:head>
  <title>Wireloop — Reset Password</title>
</svelte:head>

<nav class="fixed top-0 left-0 right-0 z-50 h-14 bg-surface border-b border-border flex items-center px-6">
  <a href="/" class="flex items-center gap-2 no-underline">
    <img src="/LOGO%20-%20Inversed.svg" alt="Wireloop" class="h-8 w-auto brightness-110" />
  </a>
</nav>

<div class="min-h-screen flex items-center justify-center px-4 pt-14 bg-background">
  <Card.Root class="w-full max-w-sm">
    <Card.Header>
      <Card.Title class="text-center">Reset Password</Card.Title>
      <Card.Description class="text-center">
        {sent ? "Check your email" : "Enter your email to receive a reset link"}
      </Card.Description>
    </Card.Header>
    <Card.Content>
      {#if error}
        <div class="mb-4 p-3 rounded-md text-sm bg-destructive/10 border border-destructive/30 text-destructive">
          {error}
        </div>
      {/if}

      {#if sent}
        <div class="flex flex-col gap-4 text-center">
          <div class="flex justify-center">
            <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <svg class="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p class="text-sm text-muted-foreground">
            If an account exists for <strong>{email}</strong>,
            you'll receive a password reset link shortly.
          </p>
        </div>
      {:else}
        <form onsubmit={async (e) => {
          e.preventDefault();
          error = "";
          submitting = true;
          try {
            await authStore.forgetPassword(email);
            sent = true;
          } catch (e: unknown) {
            error = e instanceof Error ? e.message : "Failed to send reset email";
          } finally {
            submitting = false;
          }
        }} class="flex flex-col gap-4">
          <div class="grid gap-2">
            <Label for="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" bind:value={email} required />
          </div>
          <Button type="submit" class="w-full" disabled={submitting}>
            {submitting ? "Sending…" : "Send Reset Link"}
          </Button>
        </form>
      {/if}
    </Card.Content>
    <Card.Footer class="flex justify-center">
      <a href="/login" class="text-sm text-muted-foreground hover:text-foreground transition-colors">
        Back to sign in
      </a>
    </Card.Footer>
  </Card.Root>
</div>
