<script lang="ts">
  import '../app.css';
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import authStore from '../stores/auth.store';
  import * as Tooltip from '$lib/components/ui/tooltip/index.js';

  import { initializeApiClient } from '../stores/api.client';

  let { children }: { children: Snippet } = $props();

  onMount(() => {
    initializeApiClient();
    const serverSession = $page.data.session;
    const serverUser = $page.data.user;

    if (serverSession && serverUser) {
      authStore.set({
        isLoggedIn: true,
        uid: serverUser.id,
        user: serverUser,
        session: serverSession,
        loading: false,
      });
    } else {
      authStore.init();
    }
  });
</script>

<main>
  <Tooltip.Provider>
    {@render children()}
  </Tooltip.Provider>
</main>