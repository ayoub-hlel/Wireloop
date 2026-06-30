<script lang="ts">
  import '../app.css';
  import type { Snippet } from 'svelte';
  import type { LayoutData } from './$types';

  export const data: LayoutData = null as unknown as LayoutData;
  export const form: any = null;

  let { children }: { children: Snippet } = $props();
</script>

<main>
  {@render children()}
</main>