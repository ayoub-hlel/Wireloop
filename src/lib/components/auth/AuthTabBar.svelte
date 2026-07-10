<script lang="ts">
  import { cn } from "$lib/utils.js";

  let { active = "signin", class: className }: { active: "signin" | "signup"; class?: string } = $props();
</script>

<div class={cn("rounded-lg p-[3px] bg-muted inline-flex w-full items-center justify-center", className)}>
  <a
    href="/login"
    class={cn(
      "gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium",
      "inline-flex h-full flex-1 items-center justify-center whitespace-nowrap transition-all",
      active === "signin"
        ? "bg-background text-foreground shadow-sm"
        : "text-foreground/60 hover:text-foreground"
    )}
  >
    Sign In
  </a>
  <a
    href="/signup"
    class={cn(
      "gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium",
      "inline-flex h-full flex-1 items-center justify-center whitespace-nowrap transition-all",
      active === "signup"
        ? "bg-background text-foreground shadow-sm"
        : "text-foreground/60 hover:text-foreground"
    )}
  >
    Sign Up
  </a>
</div>
