<script lang="ts">
  import Toggle from '$lib/components/ui/toggle/toggle.svelte';
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
    <Toggle pressed={view === 'grid'} onclick={() => onViewChange('grid')} aria-label="Grid view">
      <LayoutGrid />
    </Toggle>
    <Toggle pressed={view === 'list'} onclick={() => onViewChange('list')} aria-label="List view">
      <List />
    </Toggle>

    <Popover.Root>
      <Popover.Trigger type="button" class="sort-trigger" aria-label="Sort options">
        <ArrowUpDown class="sort-trigger-icon" />
        <span>{sort === 'updatedAt' ? 'Last modified' : 'Name'}</span>
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
    gap: 0.75rem;
    padding: 0.75rem 0;
  }

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
  }

  /* ponytail: :global because these classes land on bits-ui/lucide children,
     which never carry this component's scope hash. */
  :global(.search-input) {
    width: 220px;
  }

  :global(.sort-trigger) {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    border: 1px solid hsl(var(--border));
    border-radius: 0.375rem;
    background: transparent;
    color: hsl(var(--foreground));
    font-size: 0.8125rem;
    cursor: pointer;
    margin-left: 0.5rem;
  }

  :global(.sort-trigger:hover) {
    background-color: hsl(var(--secondary));
  }

  :global(.sort-trigger-icon) {
    width: 16px;
    height: 16px;
  }

  .sort-options {
    display: flex;
    flex-direction: column;
    padding: 0.25rem;
  }

  .sort-option {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 0.375rem 0.5rem;
    border: none;
    border-radius: 0.25rem;
    background: transparent;
    color: hsl(var(--foreground));
    font-size: 0.8125rem;
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
</style>
