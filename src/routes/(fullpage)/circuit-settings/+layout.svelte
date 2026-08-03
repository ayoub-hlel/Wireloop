<script lang="ts">
  import type { Snippet } from 'svelte';
  import { page } from '$app/stores';
  let { children }: { children: Snippet } = $props();
  let segment = $derived($page.url.pathname.replace(/^\/circuit-settings\//, '') || undefined);
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  let value = $state('');
  async function navigate(e: Event) {
    await goto((e.target as HTMLSelectElement).value);
  }

  onMount(() => {
    // This is to fix the drop down box
    value = segment ? '/circuit-settings/' + segment : '/circuit-settings';
  });

  $effect(() => {
    if (segment) {
      value = segment ? '/circuit-settings/' + segment : '/circuit-settings';
    }
  });
</script>

<main class="container-fluid">
  <div class="row">
    <div class="col">
      <h2>Circuit Settings</h2>
    </div>
  </div>
  <div class="row">
    <div class="col">
      <div class="form-group">
        <label for="exampleSelect">Navigation</label>
        <select
          bind:value
          name="select"
          onchange={navigate}
          id="exampleSelect"
          class="form-control"
        >
          <option value="/circuit-settings">Circuit</option>
          <option value="/circuit-settings/about">About</option>
          <option value="/circuit-settings/support">Support</option>
          <option value="/circuit-settings/feature-request">Feature Requests</option>
          <option value="/circuit-settings/bugs">Report a bug</option>

          <option value="/circuit-settings/privacy-policy">Privacy Policy</option>
        </select>
      </div>
    </div>
  </div>
  <hr />

  {@render children()}
</main>

<style>
  main {
    overflow-y: hidden;
    overflow-x: hidden;
    margin-top: 10px;
    margin-bottom: 10px;
  }
</style>
