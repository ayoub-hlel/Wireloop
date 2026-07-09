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

  let activeTab = $state("signup");
  let signinEmail = $state("");
  let signinPassword = $state("");
  let signupUsername = $state("");
  let signupEmail = $state("");
  let signupPassword = $state("");
  let error = $state("");
  let submitting = $state(false);
  let sentEmail = $state("");
  let resendCooldown = $state(0);
  let resendLoading = $state(false);

  onMount(() => {
    const tab = $page.url.searchParams.get("tab");
    if (tab === "signin") activeTab = "signin";
  });

  async function handleSignIn() {
    error = "";
    submitting = true;
    try {
      await authStore.signInEmail(signinEmail, signinPassword);
      await goto("/studio");
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : "Sign in failed";
    } finally {
      submitting = false;
    }
  }

  async function handleSignUp() {
    error = "";
    submitting = true;
    try {
      await authStore.signUp(signupEmail, signupPassword, signupUsername);
      sentEmail = signupEmail;
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
      await authStore.resendVerification(sentEmail);
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
  <title>Wireloop — Sign Up</title>
</svelte:head>

<!-- Nav -->
<nav class="fixed top-0 left-0 right-0 z-50 h-14 bg-surface border-b border-border flex items-center px-6">
  <a href="/" class="flex items-center gap-2 no-underline">
    <img src="/LOGO%20-%20Inversed.svg" alt="Wireloop" class="h-8 w-auto brightness-110" />
  </a>
</nav>

<div class="min-h-screen flex items-center justify-center px-4 pt-14 bg-background">
  <Card.Root class="w-full max-w-sm">
    <Card.Header>
      <Card.Title class="text-center">Welcome</Card.Title>
      <Card.Description class="text-center">
        {sentEmail ? "Verify your email" : "Create your account"}
      </Card.Description>
    </Card.Header>
    <Card.Content>
      {#if error}
        <div class="mb-4 p-3 rounded-md text-sm bg-destructive/10 border border-destructive/30 text-destructive">
          {error}
        </div>
      {/if}

      {#if sentEmail}
        <div class="flex flex-col gap-4 text-center">
          <div class="flex justify-center">
            <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <svg class="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p class="text-sm text-muted-foreground">
            We sent a verification email to <strong>{sentEmail}</strong>.
            Click the link in the email to verify your account.
          </p>
          <p class="text-xs text-muted-foreground">
            After verifying, you'll be redirected to set up your profile.
          </p>
          <Button
            variant="outline"
            class="w-full"
            onclick={handleResend}
            disabled={resendCooldown > 0 || resendLoading}
          >
            {resendLoading ? "Sending..." : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend verification email"}
          </Button>
        </div>
      {:else}
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
      {/if}
    </Card.Content>
    <Card.Footer class="flex justify-center">
      <a href="/login" class="text-sm text-muted-foreground hover:text-foreground transition-colors">
        Already have an account? Sign in
      </a>
    </Card.Footer>
  </Card.Root>
</div>
