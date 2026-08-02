<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import AuthTabBar from "$lib/components/auth/AuthTabBar.svelte";
  import OAuthButtons from "$lib/components/auth/OAuthButtons.svelte";
  import authStore from "../../stores/auth.store";

  let email = $state("");
  let password = $state("");
  let error = $state("");
  let submitting = $state(false);
  let unverified = $state(false);
  let resendCooldown = $state(0);
  let resendLoading = $state(false);
  let resendSent = $state(false);

  // Studio/auth gate signals a server config error via ?reason=auth-unavailable
  // (WL-002) — show it instead of silently failing.
  let serverAuthIssue = $derived(
    $page.url.searchParams.get("reason") === "auth-unavailable"
  );

  // ponytail: reactive guard — no race with authStore.init()
  $effect(() => {
    if ($authStore.isLoggedIn && !$authStore.loading) {
      goto("/projects", { replaceState: true });
    }
  });

  async function handleSignIn() {
    error = "";
    submitting = true;
    unverified = false;
    try {
      await authStore.signInEmail(email, password);
      // ponytail: $effect handles redirect after store updates
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Sign in failed";
      if (msg.toLowerCase().includes("verify") || msg.toLowerCase().includes("unverified")) {
        unverified = true;
        error = "";
      } else {
        error = msg;
      }
    } finally {
      submitting = false;
    }
  }

  async function handleResend() {
    resendLoading = true;
    error = "";
    try {
      await authStore.resendVerification(email);
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
</script>

<svelte:head>
  <title>Wireloop — Sign In</title>
</svelte:head>

<nav class="fixed top-0 left-0 right-0 z-50 h-14 bg-surface border-b border-border flex items-center px-6">
  <a href="/" class="flex items-center gap-2 no-underline">
    <img src="/LOGO%20-%20Inversed.svg" alt="Wireloop" class="h-8 w-auto brightness-110" />
  </a>
</nav>

<div class="min-h-screen flex items-center justify-center px-4 pt-14 bg-background">
  <Card.Root class="w-full max-w-sm">
    <Card.Header>
      <Card.Title class="text-center">Welcome</Card.Title>
      <Card.Description class="text-center">Sign in to your account</Card.Description>
    </Card.Header>
    <Card.Content>
      <AuthTabBar active="signin" class="mb-4" />

      {#if error}
        <div class="mb-4 p-3 rounded-md text-sm bg-destructive/10 border border-destructive/30 text-destructive">
          {error}
        </div>
      {/if}

      {#if serverAuthIssue}
        <div class="mb-4 p-3 rounded-md text-sm bg-destructive/10 border border-destructive/30 text-destructive">
          Sign-in is temporarily unavailable: the server's authentication service isn't configured
          (missing database or auth secret). Please try again later.
        </div>
      {/if}

      {#if unverified}
        <div class="mb-4 p-3 rounded-md text-sm bg-primary/10 border border-primary/30 text-primary">
          <p class="font-medium mb-1">Please verify your email address</p>
          <p class="text-xs text-muted-foreground mb-2">
            We sent a verification link to <strong>{email}</strong>.
            {#if resendSent}
              A new verification email has been sent.
            {/if}
          </p>
          <Button
            variant="outline"
            size="sm"
            class="w-full"
            onclick={handleResend}
            disabled={resendCooldown > 0 || resendLoading}
          >
            {resendLoading ? "Sending..." : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend verification email"}
          </Button>
        </div>
      {/if}

      <OAuthButtons />

      <div class="relative my-4">
        <div class="absolute inset-0 flex items-center">
          <span class="w-full border-t border-border" />
        </div>
        <div class="relative flex justify-center text-xs uppercase">
          <span class="bg-card px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <form onsubmit={(e) => { e.preventDefault(); handleSignIn(); }} class="flex flex-col gap-4">
        <div class="grid gap-2">
          <Label for="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" bind:value={email} required />
        </div>
        <div class="grid gap-2">
          <div class="flex items-center justify-between">
            <Label for="password">Password</Label>
            <a href="/forgot-password" class="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Forgot password?
            </a>
          </div>
          <Input id="password" type="password" placeholder="••••••••" bind:value={password} required />
        </div>
        <Button type="submit" class="w-full" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign In"}
        </Button>
      </form>
    </Card.Content>
    <Card.Footer class="flex justify-center">
      <a href="/signup" class="text-sm text-muted-foreground hover:text-foreground transition-colors">
        Don't have an account? Sign up
      </a>
    </Card.Footer>
  </Card.Root>
</div>
