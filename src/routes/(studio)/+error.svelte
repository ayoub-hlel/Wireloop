<script lang="ts">
  import { dev } from '$app/environment';
  
  export let status: number;
  export const error: Error = null as unknown as Error;
</script>

<style>
  h1 {
    margin: 0 auto;
  }

  h1 {
    font-size: 2.8em;
    font-weight: 700;
    margin: 0 0 0.5em 0;
  }


  @media (min-width: 480px) {
    h1 {
      font-size: 4em;
    }
  }
</style>

<svelte:head>
  <title>{status}</title>
</svelte:head>

<h1>{status}</h1>

<!-- <p>{error?.message}</p> -->

<!-- {#if dev && error.stack}
  <pre>{error.stack}</pre>
{/if} -->
