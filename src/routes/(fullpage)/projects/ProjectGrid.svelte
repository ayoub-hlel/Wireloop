<script lang="ts">
  import ProjectCard from './ProjectCard.svelte';
  import type { DashboardProject } from './dashboard.svelte.ts';

  type Props = {
    projects: DashboardProject[];
    starredIds?: string[];
    emptyText?: string;
    onOpen?: (id: string) => void;
    onStar?: (id: string) => void;
    onFork?: (id: string) => void;
    onTrash?: (id: string) => void;
  };

  let {
    projects,
    starredIds = [],
    emptyText = 'No projects yet.',
    onOpen = () => {},
    onStar = () => {},
    onFork = () => {},
    onTrash = () => {},
  }: Props = $props();
</script>

{#if projects.length > 0}
  <div class="project-grid">
    {#each projects as project (project.id)}
      <ProjectCard
        {project}
        starred={starredIds.includes(project.id)}
        {onOpen}
        {onStar}
        {onFork}
        {onTrash}
      />
    {/each}
  </div>
{:else}
  <div class="empty-state">{emptyText}</div>
{/if}

<style>
  .project-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
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
