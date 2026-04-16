<script lang="ts">
  export let segment;
  import { goto } from '$app/navigation';;
  import { onMount } from 'svelte';
  let value: string;
  async function navigate(e: Event) {
    await goto((e.target as HTMLSelectElement).value);
  }

  onMount(() => {
    // This is to fix the drop down box
    value = segment ? '/settings/' + segment : '/settings';
    //selectBox.value = value;
  });

  $: if (segment) {
    value = segment ? '/settings/' + segment : '/settings';
  }
</script>

<main class="container-fluid">
  <div class="row">
    <div class="col">
      <h2>Settings</h2>
    </div>
  </div>
  <div class="row">
    <div class="col">
      <div class="form-group">
        <label for="exampleSelect">Navigation</label>
        <select
          bind:value
          name="select"
          on:change={navigate}
          id="exampleSelect"
          class="form-control"
        >
          <option value="/settings">Circuit</option>
          <option value="/settings/myprofile">My Profile</option>
          <option value="/settings/about">About</option>
          <option value="/settings/support">Support</option>
          <option value="/settings/feature-request">Feature Requests</option>
          <option value="/settings/bugs">Report a bug</option>

          <option value="/settings/privacy-policy">Privacy Policy</option>
        </select>
      </div>
    </div>
  </div>
  <hr />

  <slot />
</main>

<style>
  main {
    overflow-y: hidden;
    overflow-x: hidden;
    margin-top: 10px;
    margin-bottom: 10px;
  }
</style>
