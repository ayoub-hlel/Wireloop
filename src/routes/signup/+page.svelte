<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import AuthTabBar from "$lib/components/auth/AuthTabBar.svelte";
  import OAuthButtons from "$lib/components/auth/OAuthButtons.svelte";
  import { goto } from "$app/navigation";
  import authStore from "../../stores/auth.store";

  // ponytail: reactive guard — no race with authStore.init()
  $effect(() => {
    if ($authStore.isLoggedIn && !$authStore.loading) {
      goto("/projects", { replaceState: true });
    }
  });

  let username = $state("");
  let email = $state("");
  let password = $state("");
  let error = $state("");
  let submitting = $state(false);
  let sentEmail = $state("");
  let resendCooldown = $state(0);
  let resendLoading = $state(false);
   let showPassword = $state(false);
   let agreePrivacy = $state(false);

   async function handleSignUp() {
     error = "";
     if (!agreePrivacy) {
       error = "You must agree to the Privacy Policy to create an account.";
       return;
     }
     submitting = true;
     try {
       await authStore.signUp(email, password, username);
       // Truthful UX: in dev (verification disabled) better-auth signs the user
       // in during signUp — refresh the session store and let the redirect guard
       // take over. Only claim "we sent an email" when no session was granted.
       await authStore.init(true);
       if (!$authStore.isLoggedIn) {
         sentEmail = email;
         resendCooldown = 60;
         const interval = setInterval(() => {
           resendCooldown--;
           if (resendCooldown <= 0) clearInterval(interval);
         }, 1000);
       }
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
      {#if !sentEmail}
        <AuthTabBar active="signup" class="mb-4" />
      {/if}

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
        <OAuthButtons />

        <div class="relative my-4">
          <div class="absolute inset-0 flex items-center">
            <span class="w-full border-t border-border"></span>
          </div>
          <div class="relative flex justify-center text-xs uppercase">
            <span class="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <form onsubmit={(e) => { e.preventDefault(); handleSignUp(); }} class="flex flex-col gap-4">
          <div class="grid gap-2">
            <Label for="username">Username</Label>
            <Input id="username" type="text" placeholder="Choose a username" bind:value={username} required />
          </div>
          <div class="grid gap-2">
            <Label for="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" bind:value={email} required />
          </div>
          <div class="grid gap-2">
            <Label for="password">Password</Label>
            <div class="password-input-wrapper">
              <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" bind:value={password} required />
              <button type="button" class="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} onclick={() => showPassword = !showPassword}>
                {#if showPassword}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                {:else}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                {/if}
              </button>
            </div>
          </div>
           <label class="privacy-check">
             <input type="checkbox" bind:checked={agreePrivacy} />
             <span>I agree to the <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a></span>
           </label>
           <Button type="submit" class="w-full" disabled={submitting || !agreePrivacy}>
             {submitting ? "Creating account…" : "Create Account"}
           </Button>
         </form>
      {/if}
    </Card.Content>
    <Card.Footer class="flex justify-center">
      <a href="/login" class="text-sm text-muted-foreground hover:text-foreground transition-colors">
        Already have an account? Sign in
      </a>
    </Card.Footer>
  </Card.Root>
</div>

<style>
  .password-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }
  .password-input-wrapper :global(input) {
    padding-right: 2.5rem;
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
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .password-toggle:hover {
    color: hsl(var(--foreground));
  }
  .privacy-check {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    color: hsl(var(--muted-foreground));
    margin-top: -0.25rem;
  }
  .privacy-check a {
    color: hsl(var(--accent));
    text-decoration: underline;
  }
</style>
