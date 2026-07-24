<script lang="ts">
  import type { DashboardProject } from './dashboard.svelte.ts';
  import Star from '@lucide/svelte/icons/star';
  import GitFork from '@lucide/svelte/icons/git-fork';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  type Props = {
    project: DashboardProject;
    starred?: boolean;
    onOpen?: (id: string) => void;
    onStar?: (id: string) => void;
    onFork?: (id: string) => void;
    onTrash?: (id: string) => void;
  };

  let {
    project,
    starred = false,
    onOpen = () => {},
    onStar = () => {},
    onFork = () => {},
    onTrash = () => {},
  }: Props = $props();

  function dateStr(d: Date | string | null): string {
    if (!d) return '';
    return new Date(d).toDateString();
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
  {#if thumbnailSrc}
    <img src={thumbnailSrc} alt={project.name} class="card-thumbnail" />
  {:else}
    <div class="card-fallback">{project.name[0]?.toUpperCase() ?? 'P'}</div>
  {/if}

  <div class="card-body">
    <h3 class="card-name">{project.name}</h3>
    <p class="card-date">{dateStr(project.updatedAt)}</p>
    {#if project.boardType}
      <p class="card-board">{project.boardType}</p>
    {/if}
  </div>

  <div class="card-actions">
    <button
      class="card-action-btn"
      aria-pressed={starred}
      aria-label={starred ? 'Unstar project' : 'Star project'}
      onclick={(e) => { e.stopPropagation(); onStar(project.id); }}
    >
      <Star class="card-action-icon" fill={starred ? 'currentColor' : 'none'} />
    </button>
    <button
      class="card-action-btn"
      aria-label="Fork project"
      onclick={(e) => { e.stopPropagation(); onFork(project.id); }}
    >
      <GitFork class="card-action-icon" />
    </button>
    <button
      class="card-action-btn"
      aria-label="Trash project"
      onclick={(e) => { e.stopPropagation(); onTrash(project.id); }}
    >
      <Trash2 class="card-action-icon" />
    </button>
  </div>
</div>

<style>
  .project-card {
    display: flex;
    flex-direction: column;
    border: 1px solid hsl(var(--border));
    border-radius: 0.5rem;
    overflow: hidden;
    background-color: hsl(var(--card));
    cursor: pointer;
    transition: box-shadow 0.15s;
  }

  .project-card:hover {
    box-shadow: 0 4px 12px hsl(var(--shadow) / 0.1);
  }

  .card-thumbnail {
    width: 100%;
    height: 140px;
    object-fit: cover;
    display: block;
  }

  .card-fallback {
    width: 100%;
    height: 140px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: hsl(var(--muted));
    color: hsl(var(--muted-foreground));
    font-size: 2.5rem;
    font-weight: 700;
  }

  .card-body {
    padding: 0.75rem;
    flex: 1;
  }

  .card-name {
    margin: 0 0 0.25rem;
    font-size: 1rem;
    font-weight: 600;
    color: hsl(var(--card-foreground));
  }

  .card-date {
    margin: 0;
    font-size: 0.8rem;
    color: hsl(var(--muted-foreground));
  }

  .card-board {
    margin: 0.25rem 0 0;
    font-size: 0.75rem;
    color: hsl(var(--muted-foreground));
    text-transform: uppercase;
  }

  .card-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.25rem;
    padding: 0.5rem 0.75rem;
    border-top: 1px solid hsl(var(--border));
  }

  .card-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: none;
    border-radius: 0.375rem;
    background: transparent;
    color: hsl(var(--muted-foreground));
    cursor: pointer;
  }

  .card-action-btn:hover {
    background-color: hsl(var(--accent));
    color: hsl(var(--foreground));
  }

  .card-action-icon {
    width: 16px;
    height: 16px;
  }
</style>
