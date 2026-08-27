<script lang="ts">
  import * as Popover from '$lib/components/ui/popover/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import List from '@lucide/svelte/icons/list';
  import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';

  type Props = {
    view?: 'grid' | 'list';
    sort?: 'updatedAt' | 'name';
    search?: string;
    onViewChange?: (v: 'grid' | 'list') => void;
    onSortChange?: (s: 'updatedAt' | 'name') => void;
    onSearch?: (q: string) => void;
  };

  let {
    view = 'grid',
    sort = 'updatedAt',
    search = $bindable(''),
    onViewChange = () => {},
    onSortChange = () => {},
    onSearch = () => {},
  }: Props = $props();
</script>

  <div class="toolbar">
  <div class="toolbar-left">
    <Popover.Root>
      <Popover.Trigger type="button" class="sort-trigger" aria-label="Sort options">
        <ArrowUpDown class="sort-trigger-icon" />
        <span class="sort-label">{sort === 'updatedAt' ? 'Last modified' : 'Name'}</span>
      </Popover.Trigger>
      <Popover.Content class="w-44" side="bottom" align="start">
        <div class="sort-options">
          <button
            class="sort-option"
            class:active={sort === 'updatedAt'}
            onclick={() => onSortChange('updatedAt')}
          >
            Last modified
          </button>
          <button
            class="sort-option"
            class:active={sort === 'name'}
            onclick={() => onSortChange('name')}
          >
            Name
          </button>
        </div>
      </Popover.Content>
    </Popover.Root>

    <button
      type="button"
      class="view-toggle"
      onclick={() => onViewChange(view === 'grid' ? 'list' : 'grid')}
      aria-label={`Switch to ${view === 'grid' ? 'list' : 'grid'} view`}
      title={`Switch to ${view === 'grid' ? 'list' : 'grid'} view`}
    >
      {#if view === 'grid'}
        <LayoutGrid />
        <span>Grid</span>
      {:else}
        <List />
        <span>List</span>
      {/if}
    </button>
  </div>

  <div class="toolbar-right">
    <Input
      placeholder="Search projects…"
      class="search-input"
      bind:value={search}
      oninput={() => onSearch(search)}
    />
  </div>
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ds-space-3);
    padding: var(--ds-space-4) 0;
  }

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: var(--ds-space-1);
    flex-shrink: 0;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
  }

  :global(.search-input) {
    width: clamp(140px, 20vw, 220px);
    min-width: 0;
  }

  :global(.sort-trigger) {
    display: inline-flex;
    align-items: center;
    gap: var(--ds-space-2);
    padding: 0.375rem 0.75rem;
    border: var(--ds-border-width) solid hsl(var(--border));
    border-radius: var(--ds-radius-sm);
    background: transparent;
    color: hsl(var(--foreground));
    font-size: var(--ds-text-caption);
    cursor: pointer;
    margin-left: 0.25rem;
  }

  :global(.sort-trigger:hover) {
    background-color: hsl(var(--secondary));
  }

  :global(.sort-trigger-icon) {
    width: 16px;
    height: 16px;
  }

  .view-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--ds-space-2);
    height: 2.25rem;
    padding: 0.375rem 0.625rem;
    border: var(--ds-border-width) solid hsl(var(--border));
    border-radius: var(--ds-radius-sm);
    background: hsl(var(--secondary));
    color: hsl(var(--foreground));
    font-size: var(--ds-text-caption);
    cursor: pointer;
  }

  .view-toggle:hover {
    border-color: hsl(var(--border-strong));
    background: hsl(var(--muted));
  }

  .view-toggle :global(svg) {
    width: 16px;
    height: 16px;
  }

  .sort-options {
    display: flex;
    flex-direction: column;
    padding: var(--ds-space-1);
  }

  .sort-option {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 0.375rem 0.5rem;
    border: none;
    border-radius: var(--ds-radius-xs);
    background: transparent;
    color: hsl(var(--foreground));
    font-size: var(--ds-text-caption);
    cursor: pointer;
    text-align: left;
  }

  .sort-option:hover,
  .sort-option.active {
    background-color: hsl(var(--secondary));
  }

  .sort-option.active {
    color: hsl(var(--foreground));
    font-weight: 600;
  }

  @media (max-width: 640px) {
    .toolbar {
      gap: var(--ds-space-2);
      padding: var(--ds-space-3) 0;
    }

    .toolbar-left {
      gap: var(--ds-space-2);
    }

    .toolbar-right {
      flex: 1;
      min-width: 0;
    }

    :global(.search-input) {
      width: 100%;
    }

    :global(.sort-trigger) {
      height: 2.25rem;
      padding: 0.375rem 0.5rem;
      margin-left: 0;
    }

    .sort-label,
    .view-toggle span {
      display: none;
    }

    .view-toggle {
      width: 2.25rem;
      padding: 0.375rem;
    }
  }
</style>
