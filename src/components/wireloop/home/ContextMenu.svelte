<script lang="ts">
  // ponytail: minimal context menu component, no unnecessary abstractions

  interface MenuItem {
    label: string;
    shortcut?: string;
    action: string;
    divider?: boolean;
  }

  let { x = 0, y = 0, show = false, onAction }: {
    x?: number;
    y?: number;
    show?: boolean;
    onAction?: (cmd: string) => void;
  } = $props();

  const items: MenuItem[] = [
    { label: "Cut", shortcut: "Ctrl+X", action: "cut" },
    { label: "Copy", shortcut: "Ctrl+C", action: "copy" },
    { label: "Paste", shortcut: "Ctrl+V", action: "paste" },
    { label: "", action: "", divider: true },
    { label: "Duplicate Line", shortcut: "Shift+Alt+↓", action: "duplicateLine" },
    { label: "Toggle Comment", shortcut: "Ctrl+/", action: "toggleComment" },
    { label: "", action: "", divider: true },
    { label: "Find", shortcut: "Ctrl+F", action: "find" },
    { label: "Find & Replace", shortcut: "Ctrl+H", action: "findReplace" },
    { label: "Go to Line", shortcut: "Ctrl+G", action: "gotoLine" },
    { label: "", action: "", divider: true },
    { label: "Select All", shortcut: "Ctrl+A", action: "selectAll" },
  ];

  function handleClick(action: string) {
    if (action) onAction?.(action);
    closeMenu();
  }

  function closeMenu() {
    onAction?.("__close__");
  }

  // Close on click outside
  function onBackdropClick() {
    closeMenu();
  }

  // Adjust position so menu doesn't overflow viewport
  let mx = $derived(Math.min(x, window.innerWidth - 200));
  let my = $derived(Math.min(y, window.innerHeight - 320));
</script>

{#if show}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-40"
    onclick={onBackdropClick}
    oncontextmenu={(e) => { e.preventDefault(); closeMenu(); }}
    role="presentation"
  ></div>

  <!-- Menu -->
  <div
    class="fixed z-50 min-w-[180px] bg-bg-surface border border-border rounded-lg shadow-2xl py-1 overflow-hidden"
    style="left: {mx}px; top: {my}px;"
    role="menu"
  >
    {#each items as item}
      {#if item.divider}
        <div class="h-px bg-border my-1 mx-2"></div>
      {:else}
        <button
          onclick={() => handleClick(item.action)}
          class="w-full flex items-center justify-between px-3 py-1.5 text-xs text-foreground hover:bg-accent/10 hover:text-accent transition-colors text-left"
          role="menuitem"
        >
          <span>{item.label}</span>
          {#if item.shortcut}
            <span class="text-text-muted text-[10px] ml-4">{item.shortcut}</span>
          {/if}
        </button>
      {/if}
    {/each}
  </div>
{/if}
