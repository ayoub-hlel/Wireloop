<script lang="ts">
  import type { Snippet } from 'svelte';
  let { children }: { children: Snippet } = $props();
  import  Nav from "../../components/wireloop/Nav.svelte";
</script>

<Nav  />
{@render children()}