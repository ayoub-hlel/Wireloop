<script lang="ts">
  import { page } from "$app/stores";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";

  let errorMsg = $derived(
    $page.url.searchParams.get("error")
      || $page.url.searchParams.get("error_description")
      || "An unexpected authentication error occurred."
  );
</script>

<svelte:head>
  <title>Wireloop — Auth Error</title>
</svelte:head>

<nav class="fixed top-0 left-0 right-0 z-50 h-14 bg-surface border-b border-border flex items-center px-6">
  <a href="/" class="flex items-center gap-2 no-underline">
    <img src="/LOGO%20-%20Inversed.svg" alt="Wireloop" class="h-8 w-auto brightness-110" />
  </a>
</nav>

<div class="min-h-screen flex items-center justify-center px-4 pt-14 bg-background">
  <Card.Root class="w-full max-w-sm">
    <Card.Header>
      <Card.Title class="text-center">Authentication Error</Card.Title>
      <Card.Description class="text-center">Something went wrong during sign-in</Card.Description>
    </Card.Header>
    <Card.Content class="flex flex-col gap-4">
      <div class="p-3 rounded-md text-sm bg-destructive/10 border border-destructive/30 text-destructive">
        {errorMsg}
      </div>
      <Button class="w-full" onclick={() => window.location.href = "/login"}>
        Back to sign in
      </Button>
    </Card.Content>
  </Card.Root>
</div>
