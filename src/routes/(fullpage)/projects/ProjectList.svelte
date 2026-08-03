<script lang="ts">
  import type { DashboardProject } from './dashboard.svelte.ts';
  import Star from '@lucide/svelte/icons/star';
  import Trash2 from '@lucide/svelte/icons/trash-2';

  type Props = {
    projects: DashboardProject[];
    starredIds?: string[];
    sort?: 'updatedAt' | 'name';
    sortDir?: 'asc' | 'desc';
    onSortChange?: (col: 'updatedAt' | 'name') => void;
    onOpen?: (id: string) => void;
    onStar?: (id: string) => void;
    onTrash?: (id: string) => void;
  };

  let {
    projects,
    starredIds = [],
    sort = 'updatedAt',
    sortDir = 'desc',
    onSortChange = () => {},
    onOpen = () => {},
    onStar = () => {},
    onTrash = () => {},
  }: Props = $props();

  function dateStr(d: Date | string | null): string {
    if (!d) return '';
    return new Date(d).toDateString();
  }

  function isActive(col: 'updatedAt' | 'name'): boolean {
    return sort === col;
  }

  function sortArrow(col: 'updatedAt' | 'name') {
    if (sort !== col) return '';
    return sortDir === 'asc' ? '▲' : '▼';
  }
</script>

<div class="table-wrap">
  <table class="project-table">
    <thead>
      <tr>
        <th>
          <button
            class="sort-btn"
            aria-label="Sort by name"
            class:active={isActive('name')}
            onclick={() => onSortChange('name')}
          >
            Name <span class="sort-arrow">{sortArrow('name')}</span>
          </button>
        </th>
        <th>Board</th>
        <th>
          <button
            class="sort-btn"
            aria-label="Sort by modified date"
            class:active={isActive('updatedAt')}
            onclick={() => onSortChange('updatedAt')}
          >
            Modified <span class="sort-arrow">{sortArrow('updatedAt')}</span>
          </button>
        </th>
        <th class="th-star">Star</th>
        <th class="th-star"></th>
      </tr>
    </thead>
    <tbody>
      {#each projects as project (project.id)}
        <tr>
          <td>
            <button
              class="name-btn"
              aria-label={`Open ${project.name}`}
              onclick={() => onOpen(project.id)}
            >
              {project.name}
            </button>
          </td>
          <td class="td-muted">{project.boardType ?? '—'}</td>
          <td class="td-muted">{dateStr(project.updatedAt)}</td>
          <td class="td-star">
            <button
              class="star-btn"
              aria-pressed={starredIds.includes(project.id)}
              aria-label={starredIds.includes(project.id) ? 'Unstar project' : 'Star project'}
              onclick={() => onStar(project.id)}
            >
              <Star
                class="star-icon"
                fill={starredIds.includes(project.id) ? 'currentColor' : 'none'}
              />
            </button>
          </td>
          <td class="td-star">
            <button
              class="star-btn"
              aria-label="Trash project"
              onclick={() => onTrash(project.id)}
            >
              <Trash2 class="star-icon" />
            </button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .table-wrap {
    overflow-x: auto;
  }

  .project-table {
    width: 100%;
    border-collapse: collapse;
  }

  .project-table th {
    text-align: left;
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: hsl(var(--muted-foreground));
    border-bottom: 1px solid hsl(var(--border));
  }

  .project-table td {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    border-bottom: 1px solid hsl(var(--border));
  }

  .project-table tbody tr:hover {
    background-color: hsl(var(--secondary));
  }

  .sort-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    border: none;
    background: transparent;
    color: hsl(var(--muted-foreground));
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
  }

  .sort-btn.active {
    color: hsl(var(--foreground));
  }

  .sort-btn:hover {
    color: hsl(var(--foreground));
  }

  .sort-arrow {
    font-size: 0.7rem;
  }

  .name-btn {
    border: none;
    background: transparent;
    color: hsl(var(--foreground));
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    padding: 0;
    text-align: left;
  }

  .name-btn:hover {
    text-decoration: underline;
  }

  .td-muted {
    color: hsl(var(--muted-foreground));
  }

  .th-star,
  .td-star {
    width: 3rem;
    text-align: center;
  }

  .star-btn {
    display: inline-flex;
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

  .star-btn:hover {
    background-color: hsl(var(--secondary));
    color: hsl(var(--foreground));
  }

  .star-icon {
    width: 16px;
    height: 16px;
  }
</style>
