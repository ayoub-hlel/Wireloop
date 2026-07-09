<script lang="ts">
  let props = $props();
  let status = $derived(props.status);
  let error = $derived(props.error);
</script>

<style>
  h1 { margin: 0 auto; font-size: 2.8em; font-weight: 700; margin: 0 0 0.5em 0; }
  @media (min-width: 480px) { h1 { font-size: 4em; } }
</style>

<svelte:head>
  <title>{status}</title>
</svelte:head>

<h1>{status}</h1>

<p>{error?.message}</p>
