<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import authStore from "../../stores/auth.store";

  let activeTab = $state("signin");
  let signinEmail = $state("");
  let signinPassword = $state("");
  let signupUsername = $state("");
  let signupEmail = $state("");
  let signupPassword = $state("");
  let error = $state("");
  let submitting = $state(false);
  let unverified = $state(false);
  let resendCooldown = $state(0);
  let resendLoading = $state(false);
  let resendSent = $state(false);

  onMount(() => {
    const tab = $page.url.searchParams.get("tab");
    if (tab === "signup") activeTab = "signup";
  });

  async function handleSignIn() {
    error = "";
    submitting = true;
    unverified = false;
    try {
      await authStore.signInEmail(signinEmail, signinPassword);
      await goto("/studio");
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

  async function handleSignUp() {
    error = "";
    submitting = true;
    try {
      await authStore.signUp(signupEmail, signupPassword, signupUsername);
      // After successful signup with email verification, go to signup page which shows the verification screen
      await goto("/signup");
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : "Sign up failed";
    } finally {
      submitting = false;
    }
  }

  async function handleResend() {
    resendLoading = true;
    error = "";
    try {
      await authStore.resendVerification(signinEmail);
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

<!-- Temp Nav -->
<nav class="fixed top-0 left-0 right-0 z-50 h-14 bg-surface border-b border-border flex items-center px-6">
  <a href="/" class="flex items-center gap-2 no-underline">
    <img src="/LOGO%20-%20Inversed.svg" alt="Wireloop" class="h-8 w-auto brightness-110" />
  </a>
</nav>

<div class="min-h-screen flex items-center justify-center px-4 pt-14 bg-background">
  <Card.Root class="w-full max-w-sm">
    <Card.Header>
      <Card.Title class="text-center">Welcome</Card.Title>
      <Card.Description class="text-center">Sign in or create an account</Card.Description>
    </Card.Header>
    <Card.Content>
      {#if error}
        <div class="mb-4 p-3 rounded-md text-sm bg-destructive/10 border border-destructive/30 text-destructive">
          {error}
        </div>
      {/if}

      {#if unverified}
        <div class="mb-4 p-3 rounded-md text-sm bg-primary/10 border border-primary/30 text-primary">
          <p class="font-medium mb-1">Please verify your email address</p>
          <p class="text-xs text-muted-foreground mb-2">
            We sent a verification link to <strong>{signinEmail}</strong>.
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

      <Tabs.Root bind:value={activeTab}>
        <Tabs.List class="w-full mb-4">
          <Tabs.Trigger value="signin" class="flex-1">Sign In</Tabs.Trigger>
          <Tabs.Trigger value="signup" class="flex-1">Sign Up</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="signin">
          <form onsubmit={(e) => { e.preventDefault(); handleSignIn(); }} class="flex flex-col gap-4">
            <div class="grid gap-2">
              <Label for="signin-email">Email</Label>
              <Input id="signin-email" type="email" placeholder="you@example.com" bind:value={signinEmail} required />
            </div>
            <div class="grid gap-2">
              <Label for="signin-password">Password</Label>
              <Input id="signin-password" type="password" placeholder="••••••••" bind:value={signinPassword} required />
            </div>
            <Button type="submit" class="w-full" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign In"}
            </Button>
          </form>
        </Tabs.Content>

        <Tabs.Content value="signup">
          <form onsubmit={(e) => { e.preventDefault(); handleSignUp(); }} class="flex flex-col gap-4">
            <div class="grid gap-2">
              <Label for="signup-username">Username</Label>
              <Input id="signup-username" type="text" placeholder="Choose a username" bind:value={signupUsername} required />
            </div>
            <div class="grid gap-2">
              <Label for="signup-email">Email</Label>
              <Input id="signup-email" type="email" placeholder="you@example.com" bind:value={signupEmail} required />
            </div>
            <div class="grid gap-2">
              <Label for="signup-password">Password</Label>
              <Input id="signup-password" type="password" placeholder="••••••••" bind:value={signupPassword} required />
            </div>
            <Button type="submit" class="w-full" disabled={submitting}>
              {submitting ? "Creating account…" : "Create Account"}
            </Button>
          </form>
        </Tabs.Content>
      </Tabs.Root>
    </Card.Content>
    <Card.Footer class="flex justify-center">
      <a href="/signup" class="text-sm text-muted-foreground hover:text-foreground transition-colors">
        Don't have an account? Sign up
      </a>
    </Card.Footer>
  </Card.Root>
</div>
