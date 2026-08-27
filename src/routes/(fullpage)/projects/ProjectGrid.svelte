<script lang="ts">
  import ProjectCard from './ProjectCard.svelte';
  import type { DashboardProject } from './dashboard.svelte.ts';
  import type { DashboardFilter } from './dashboard.svelte.ts';

  type Props = {
    projects: DashboardProject[];
    starredIds?: string[];
    emptyText?: string;
    trashed?: boolean;
    context?: DashboardFilter;
    onOpen?: (id: string) => void;
    onStar?: (id: string) => void;
    onFork?: (id: string) => void;
    onTrash?: (id: string) => void;
    onRestore?: (id: string) => void;
  };

  let {
    projects,
    starredIds = [],
    emptyText = 'No projects yet.',
    trashed = false,
    context = 'projects',
    onOpen = () => {},
    onStar = () => {},
    onFork = () => {},
    onTrash = () => {},
    onRestore = () => {},
  }: Props = $props();
</script>

{#if projects.length > 0}
  <div class="project-grid">
    {#each projects as project (project.id)}
      <ProjectCard
        {project}
        starred={starredIds.includes(project.id)}
        {trashed}
        {context}
        {onOpen}
        {onStar}
        {onFork}
        {onTrash}
        {onRestore}
      />
    {/each}
  </div>
{:else}
  <div class="empty-state">{emptyText}</div>
{/if}

<style>
  .project-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(var(--project-card-width), 100%), 1fr));
    gap: clamp(1rem, 2vw, 1.5rem);
    justify-content: start;
  }

  @media (max-width: 768px) {
    .project-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    color: hsl(var(--muted-foreground));
    text-align: center;
  }
</style>
