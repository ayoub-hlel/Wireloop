<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { getApiClient } from '../../../stores/api.client';

  interface Notification {
    id: string;
    type: 'org_project_created' | 'org_project_deleted' | 'invite_received' | 'ownership_transferred';
    payload: { projectName?: string; orgName?: string; inviteId?: string; kind?: string; targetId?: string; inviterName?: string; inviter?: string };
    readAt: string | null;
    createdAt: string;
  }

  let open = $state(false);
  let items = $state<Notification[]>([]);
  let loading = $state(false);

  const TYPE_LABEL: Record<string, (n: Notification) => string> = {
    org_project_created: (n) => `New project "${n.payload.projectName}" created`,
    org_project_deleted: (n) => `Project "${n.payload.projectName}" deleted`,
    invite_received: (n) => `${n.payload.inviterName ?? 'Someone'} invited you to a ${n.payload.kind ?? 'project'}`,
    ownership_transferred: (_n) => `Ownership transferred to you`,
  };

  function label(n: Notification): string {
    return (TYPE_LABEL[n.type] ?? (() => 'Notification'))(n);
  }

  async function load() {
    if (!browser) return;
    loading = true;
    try {
      items = (await getApiClient().query('notifications:list', {})) as Notification[];
    } catch { /* non-fatal */ }
    loading = false;
  }

  async function accept(n: Notification) {
    if (!n.payload.inviteId) return;
    try {
      await getApiClient().mutation('invite:accept', { inviteId: n.payload.inviteId });
      items = items.filter(i => i.id !== n.id);
    } catch { /* non-fatal */ }
  }

  async function decline(n: Notification) {
    if (!n.payload.inviteId) return;
    try {
      await getApiClient().mutation('invite:decline', { inviteId: n.payload.inviteId });
      items = items.filter(i => i.id !== n.id);
    } catch { /* non-fatal */ }
  }

  async function markRead() {
    const unread = items.filter(i => !i.readAt);
    if (!unread.length) return;
    try {
      await getApiClient().mutation('notification:markAllRead', {});
      items = items.map(i => ({ ...i, readAt: i.readAt ?? new Date().toISOString() }));
    } catch { /* non-fatal */ }
  }

  let visibilityHandler: (() => void) | null = null;

  onMount(() => {
    load();
    // ponytail: refetch on tab focus instead of 30s polling
    visibilityHandler = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', visibilityHandler);
  });

  onDestroy(() => {
    if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
  });

  let unread = $derived(items.filter(i => !i.readAt).length);
</script>

<div class="notif-wrap">
  <button class="sidebar-icon-btn" aria-label="Notifications" onclick={() => { open = !open; if (open) { load(); markRead(); } }}>
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="M12.992 6.124Q13 6.064 13 6a1 1 0 1 0-1.992.124A4 4 0 0 0 8 10v1.172a5.83 5.83 0 0 1-1.707 4.12A1 1 0 0 0 7 17h3a2 2 0 0 0 4 0h3a1 1 0 0 0 .707-1.707A5.83 5.83 0 0 1 16 11.172V10a4 4 0 0 0-3.008-3.876M12 18a1 1 0 0 1-1-1h2a1 1 0 0 1-1 1m5-2a6.82 6.82 0 0 1-2-4.828V10a3 3 0 1 0-6 0v1.172A6.83 6.83 0 0 1 7 16z" clip-rule="evenodd"/></svg>
    {#if unread > 0}<span class="notif-badge">{unread}</span>{/if}
  </button>

  {#if open}
    <div class="notif-popover" role="menu">
      <div class="notif-header">
        <span class="notif-title">Notifications</span>
      </div>
      <div class="notif-list">
        {#if loading && items.length === 0}
          <div class="notif-empty">Loading…</div>
        {:else if items.length === 0}
          <div class="notif-empty">No notifications</div>
        {:else}
          {#each items as n (n.id)}
            <div class="notif-item" class:unread={!n.readAt}>
              <div class="notif-text">{label(n)}</div>
              {#if n.type === 'invite_received' && !n.readAt}
                <div class="notif-actions">
                  <button class="notif-btn notif-btn-accept" onclick={() => accept(n)}>Accept</button>
                  <button class="notif-btn notif-btn-decline" onclick={() => decline(n)}>Decline</button>
                </div>
              {/if}
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .notif-wrap { position: relative; display: flex; }
  .notif-badge {
    position: absolute;
    top: 2px; right: 2px;
    min-width: 16px; height: 16px;
    border-radius: 8px;
    background: hsl(var(--destructive));
    color: #fff;
    font-size: 10px;
    line-height: 16px;
    text-align: center;
    padding: 0 4px;
  }
  .notif-popover {
    position: absolute;
    top: 36px; right: 0;
    width: 280px;
    background: hsl(var(--popover));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    box-shadow: var(--shadow-elevated);
    z-index: 50;
  }
  .notif-header { padding: 0.5rem 0.75rem; border-bottom: 1px solid hsl(var(--border)); }
  .notif-title { font-size: 0.8125rem; font-weight: 600; }
  .notif-list { max-height: 320px; overflow-y: auto; }
  .notif-empty { padding: 1rem; text-align: center; color: hsl(var(--muted-foreground)); font-size: 0.75rem; }
  .notif-item { padding: 0.625rem 0.75rem; border-bottom: 1px solid hsl(var(--border)); }
  .notif-item.unread { background: hsla(var(--accent) / 0.06); }
  .notif-text { font-size: 0.75rem; color: hsl(var(--foreground)); }
  .notif-actions { display: flex; gap: 0.375rem; margin-top: 0.375rem; }
  .notif-btn {
    font-size: 0.6875rem; padding: 0.25rem 0.5rem;
    border-radius: calc(var(--radius) / 2);
    border: 1px solid hsl(var(--border));
    background: transparent; cursor: pointer;
  }
  .notif-btn-accept { background: hsl(var(--accent)); color: #fff; border-color: hsl(var(--accent)); }
</style>
