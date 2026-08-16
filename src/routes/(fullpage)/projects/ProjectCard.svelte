<script lang="ts">
  import type { DashboardProject, DashboardFilter } from './dashboard.svelte.ts';
  import Star from '@lucide/svelte/icons/star';
  import GitFork from '@lucide/svelte/icons/git-fork';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Undo2 from '@lucide/svelte/icons/undo-2';

  type Props = {
    project: DashboardProject;
    starred?: boolean;
    trashed?: boolean;
    context?: DashboardFilter;
    onOpen?: (id: string) => void;
    onStar?: (id: string) => void;
    onFork?: (id: string) => void;
    onTrash?: (id: string) => void;
    onRestore?: (id: string) => void;
  };

  let {
    project,
    starred = false,
    trashed = false,
    context = 'projects',
    onOpen = () => {},
    onStar = () => {},
    onFork = () => {},
    onTrash = () => {},
    onRestore = () => {},
  }: Props = $props();

  let showProvenance = $derived(context === 'community' || context === 'starred');
  let showForkOrigin = $derived(project.isForked && project.originalName);
  let showCreator = $derived(showProvenance && project.creatorName);
  // ponytail: deterministic gradient from board type so each card looks distinct.
  let fallbackHue = $derived(project.boardType === 'mega' ? 200 : project.boardType === 'nano' ? 280 : 140);

  function timeAgo(d: Date | string | null): string {
    if (!d) return '';
    const date = new Date(d);
    const now = Date.now();
    const diff = now - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  }

  let thumbnailSrc = $derived(project.thumbnailUrl ?? '');
</script>

<div
  class="project-card"
  role="button"
  tabindex="0"
  aria-label={`Open ${project.name}`}
  onclick={() => onOpen(project.id)}
  onkeydown={(e) => e.key === 'Enter' && onOpen(project.id)}
>
  <!-- Thumbnail -->
  {#if thumbnailSrc}
    <img src={thumbnailSrc} alt={project.name} class="card-thumbnail" loading="lazy" decoding="async" />
  {:else}
    <div class="card-thumbnail card-thumbnail-fallback" style="background: linear-gradient(135deg, hsl({fallbackHue} 30% 88%), hsl({fallbackHue} 25% 78%))">
      <span style="color: hsl({fallbackHue} 40% 40%)">{project.boardType?.toUpperCase() ?? project.name[0]?.toUpperCase() ?? 'P'}</span>
    </div>
  {/if}

  <!-- Info -->
  <div class="card-info">
    <div class="card-top-row">
      <h3 class="card-name" title={project.name}>{project.name}</h3>
      {#if showForkOrigin}
        <span class="card-badge">Forked</span>
      {:else if project.isForked}
        <span class="card-badge">Forked</span>
      {/if}
    </div>
    {#if showForkOrigin}
      <p class="card-meta card-provenance">
        <span>Forked from <strong>{project.originalName}</strong></span>
      </p>
    {:else if showCreator}
      <p class="card-meta card-provenance">
        <span>By <strong>{project.creatorName}</strong></span>
      </p>
    {/if}
    <p class="card-meta">
      {#if project.boardType}
        <span class="card-board">{project.boardType}</span>
        <span class="card-dot">·</span>
      {/if}
      <span>Edited {timeAgo(project.updatedAt)}</span>
    </p>
  </div>

  <!-- Actions -->
  <div class="card-actions">
    {#if trashed}
      <button
        class="card-action-btn"
        title="Restore project"
        onclick={(e) => { e.stopPropagation(); onRestore(project.id); }}
      >
        <Undo2 size={15} />
      </button>
    {:else}
      <button
        class="card-action-btn"
        class:active={starred}
        title={starred ? 'Unstar project' : 'Star project'}
        onclick={(e) => { e.stopPropagation(); onStar(project.id); }}
      >
        <Star size={15} fill={starred ? 'currentColor' : 'none'} />
      </button>
      <button
        class="card-action-btn"
        title="Fork project"
        onclick={(e) => { e.stopPropagation(); onFork(project.id); }}
      >
        <GitFork size={15} />
      </button>
      <button
        class="card-action-btn card-action-danger"
        title="Delete project"
        onclick={(e) => { e.stopPropagation(); onTrash(project.id); }}
      >
        <Trash2 size={15} />
      </button>
    {/if}
  </div>
</div>

<style>
  .project-card {
    display: flex;
    flex-direction: column;
    width: min(var(--project-card-width), 100%);
    max-width: 100%;
    height: var(--project-card-height);
    border-radius: 0.75rem;
    overflow: hidden;
    background-color: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    cursor: pointer;
    justify-self: center;
    transition: border-color 150ms, box-shadow 150ms;
  }

  .project-card:hover {
    border-color: hsl(var(--border-strong));
    box-shadow: var(--shadow-card);
  }

  .project-card:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
  }

  /* Thumbnail */
  .card-thumbnail {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    display: block;
    background-color: hsl(var(--muted));
  }

  .card-thumbnail-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: hsl(var(--muted));
  }

  .card-thumbnail-fallback span {
    font-size: 2rem;
    font-weight: 600;
    color: hsl(var(--muted-foreground));
    letter-spacing: -0.02em;
  }

  /* Info */
  .card-info {
    padding: 0.75rem 0.875rem 0.5rem;
    flex: 1;
  }

  .card-top-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .card-name {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 600;
    color: hsl(var(--foreground));
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    letter-spacing: -0.01em;
  }

  .card-badge {
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: hsl(var(--muted-foreground));
    background-color: hsl(var(--secondary));
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    flex-shrink: 0;
  }

  .card-meta {
    margin: 0;
    font-size: 0.75rem;
    color: hsl(var(--muted-foreground));
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .card-board {
    font-weight: 500;
  }

  .card-dot {
    color: hsl(var(--muted-foreground) / 0.5);
  }

  .card-provenance {
    font-size: 0.75rem;
    color: hsl(var(--muted-foreground));
    margin: 0;
  }

  .card-provenance strong {
    font-weight: 500;
    color: hsl(var(--foreground));
  }

  /* Actions */
  .card-actions {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0.375rem 0.5rem 0.5rem;
    border-top: 1px solid hsl(var(--border));
  }

  .card-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 0.375rem;
    background: transparent;
    color: hsl(var(--muted-foreground) / 0.6);
    cursor: pointer;
    transition: background 150ms, color 150ms;
  }

  .card-action-btn:hover {
    background-color: hsl(var(--secondary));
    color: hsl(var(--foreground));
  }

  .card-action-btn.active {
    color: hsl(var(--warning));
  }

  .card-action-danger:hover {
    color: hsl(var(--destructive));
  }
</style>
