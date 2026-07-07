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

  onMount(() => {
    const tab = $page.url.searchParams.get("tab");
    if (tab === "signup") activeTab = "signup";
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
      sessionStorage.setItem("pendingSignup", JSON.stringify({
        email: signupEmail, password: signupPassword, username: signupUsername,
      }));
      await goto("/onboarding");
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : "Sign up failed";
    } finally {
      submitting = false;
    }
  }

  async function handleSocial(provider: "google" | "github") {
    await authStore.signInSocial(provider);
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

      <!-- Social Buttons -->
      <div class="flex flex-col gap-2 mb-4">
        <Button variant="outline" class="w-full justify-center" onclick={() => handleSocial("google")}>
          <svg class="size-4 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </Button>
        <Button variant="outline" class="w-full justify-center" onclick={() => handleSocial("github")}>
          <svg class="size-4 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.33.72-4.03-1.6-4.03-1.6-.54-1.38-1.33-1.75-1.33-1.75-1.08-.74.08-.73.08-.73 1.2.09 1.83 1.23 1.83 1.23 1.07 1.83 2.8 1.3 3.49.99.1-.78.42-1.3.76-1.6-2.66-.3-5.46-1.33-5.46-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23.96-.27 1.98-.4 3-.4s2.04.13 3 .4c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.8 5.63-5.47 5.93.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.28 0 .32.22.7.83.58C20.56 21.8 24 17.3 24 12 24 5.37 18.63 0 12 0z"/></svg>
          Continue with GitHub
        </Button>
      </div>

      <div class="relative mb-4">
        <div class="absolute inset-0 flex items-center"><span class="w-full border-t border-border"></span></div>
        <div class="relative flex justify-center text-xs"><span class="px-2 text-muted-foreground bg-card">or continue with email</span></div>
      </div>

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
  </Card.Root>
</div>
