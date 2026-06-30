<script lang="ts">
  import type { Snippet } from 'svelte';

  let { top: topContent, bottom: bottomContent }: { top: Snippet; bottom: Snippet } = $props();
</script>

<main class="h-full flex flex-col overflow-hidden" id="split-container">
  <section id="top" class="flex-1 overflow-hidden min-h-0">
    {@render topContent()}
  </section>

  <div class="h-px shrink-0 bg-border"></div>

  <section id="bottom" class="h-[240px] shrink-0 overflow-y-auto bg-bg-surface border-t border-border shadow-inset-trace">
    {@render bottomContent()}
  </section>
</main>

<style>
  #bottom::-webkit-scrollbar { width: 6px; }
  #bottom::-webkit-scrollbar-track { background: hsl(var(--background)); }
  #bottom::-webkit-scrollbar-thumb {
    background: hsl(var(--border));
    border-radius: var(--radius);
  }
  #bottom::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground)); }
</style>
