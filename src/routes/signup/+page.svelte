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
      <Card.Description class="text-center">Create your account</Card.Description>
    </Card.Header>
    <Card.Content>
      {#if error}
        <div class="mb-4 p-3 rounded-md text-sm bg-destructive/10 border border-destructive/30 text-destructive">
          {error}
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
      <a href="/login" class="text-sm text-muted-foreground hover:text-foreground transition-colors">
        Already have an account? Sign in
      </a>
    </Card.Footer>
  </Card.Root>
</div>
