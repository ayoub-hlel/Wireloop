<script lang="ts">
  import { onMount } from "svelte";
  import codeStore from "../../../stores/code.store";
  import { get } from "svelte/store";
  import { EditorView, basicSetup } from "codemirror";
  import { EditorState } from "@codemirror/state";
  import { cpp } from "@codemirror/lang-cpp";
  import { keymap } from "@codemirror/view";
  import { defaultKeymap, historyKeymap } from "@codemirror/commands";
  import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";

  let container: HTMLElement | undefined = $state();
  let editorView: EditorView | undefined = $state();
  let fontSize = $state(14);
  let cursorLine = $state(1);
  let cursorCol = $state(1);
  let copyState = $state<'idle' | 'copied' | 'error'>('idle');

  function makeEditor(doc: string) {
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.selectionSet) {
        const pos = update.state.selection.main.head;
        const line = update.state.doc.lineAt(pos);
        cursorLine = line.number;
        cursorCol = pos - line.from + 1;
      }
    });

    const state = EditorState.create({
      doc,
      extensions: [
          basicSetup,
          cpp(),
          EditorState.readOnly.of(true),
          EditorView.editable.of(false),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
        highlightSelectionMatches(),
        EditorView.theme({
          "&": { fontSize: `${fontSize}px`, backgroundColor: "transparent", height: "100%" },
          ".cm-scroller": { fontFamily: '"JetBrains Mono", monospace', overflow: "auto" },
          ".cm-gutters": { backgroundColor: "hsl(var(--background))", borderRight: "1px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))" },
          ".cm-activeLineGutter": { backgroundColor: "hsl(var(--accent) / 0.1)" },
          ".cm-activeLine": { backgroundColor: "hsl(var(--accent) / 0.05)" },
          ".cm-cursor": { borderLeftColor: "hsl(var(--primary))" },
          ".cm-selectionBackground": { backgroundColor: "hsl(var(--primary) / 0.2) !important" },
          ".cm-matchingBracket": { backgroundColor: "hsl(var(--primary) / 0.15)", outline: "1px solid hsl(var(--primary) / 0.3)" },
          "&.cm-focused .cm-selectionBackground": { backgroundColor: "hsl(var(--primary) / 0.25) !important" },
          ".cm-search": { backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)", padding: "4px" },
          ".cm-panel.cm-search label, .cm-panel.cm-search input": { color: "hsl(var(--foreground))" },
          ".cm-panel.cm-search input": { backgroundColor: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)", padding: "2px 6px" },
          ".cm-foldPlaceholder": { backgroundColor: "hsl(var(--accent) / 0.1)", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))" },
        }),
        updateListener,
      ],
    });

    editorView = new EditorView({ state, parent: container });
  }

  function rebuildEditor() {
    if (!editorView) return;
    const text = editorView.state.doc.toString();
    editorView.destroy();
    makeEditor(text);
  }

  onMount(() => {
    const info = get(codeStore);
    makeEditor(info.code);

    const unsub = codeStore.subscribe((info) => {
      if (editorView) {
        const current = editorView.state.doc.toString();
        if (current !== info.code) {
          editorView.dispatch({
            changes: { from: 0, to: current.length, insert: info.code },
          });
        }
      }
    });

    return () => {
      unsub();
      editorView?.destroy();
    };
  });

  function zoomIn() { fontSize += 2; rebuildEditor(); }
  function zoomOut() { if (fontSize <= 6) return; fontSize -= 2; rebuildEditor(); }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(get(codeStore).code);
      copyState = 'copied';
    } catch {
      copyState = 'error';
    }
  }
</script>

<div class="code-editor-shell flex flex-col flex-1 min-h-0" role="region" aria-label="Generated Arduino code">
  <!-- Toolbar -->
  <div class="editor-toolbar flex items-center justify-between px-3 py-2 shrink-0">
    <div class="flex items-center gap-1.5 min-w-0">
      <span class="editor-file-dot" aria-hidden="true"></span>
      <h2 class="!text-base !m-0 font-sans font-semibold text-slate-200 truncate leading-none">arduino.ino</h2>
      <span class="text-[10px] font-sans text-slate-500">Generated from blocks</span>
    </div>
    <div class="flex items-center gap-0.5 shrink-0">
      <button onclick={copyCode} class="editor-action flex items-center gap-1.5" title="Copy generated code" aria-label="Copy generated code">
        <i class="fa fa-clipboard text-[9px]"></i>
        <span class="hidden sm:inline">{copyState === 'copied' ? 'Copied' : 'Copy'}</span>
      </button>
      <button onclick={zoomOut} class="editor-icon-action" title="Decrease font size" aria-label="Decrease font size">
        <i class="fa fa-search-minus text-[8px]"></i>
      </button>
      <button onclick={zoomIn} class="editor-icon-action" title="Increase font size" aria-label="Increase font size">
        <i class="fa fa-search-plus text-[8px]"></i>
      </button>
    </div>
  </div>

  <!-- Editor -->
  <div class="flex-1 min-h-0 relative">
    <div class="absolute inset-0 bg-grid-schematic opacity-5 pointer-events-none"></div>
    <div bind:this={container} class="absolute inset-0 overflow-hidden"></div>
  </div>

  <!-- Status bar -->
  <div class="editor-status flex items-center justify-between px-3 py-1.5 text-[10px] font-mono shrink-0" role="status" aria-live="polite">
    <div class="flex items-center gap-3">
      <span>Ln {cursorLine}, Col {cursorCol}</span>
      <span class="text-emerald-400">● generated</span>
      {#if copyState === 'error'}<span class="text-rose-400">Copy failed</span>{/if}
    </div>
    <div class="flex items-center gap-2">
      <span>UTF-8</span>
      <span>Arduino C++</span>
    </div>
  </div>
</div>

<style>
  .code-editor-shell {
    --editor-bg: #1e1e1e;
    --editor-surface: #252526;
    --editor-border: #3c3c3c;
    --editor-text: #d4d4d4;
    background: var(--editor-bg);
    color: var(--editor-text);
  }
  .editor-toolbar { background: var(--editor-surface); border-bottom: 1px solid var(--editor-border); }
  .editor-file-dot { width: 7px; height: 7px; border-radius: 999px; background: #4ec9b0; flex-shrink: 0; }
  .editor-action, .editor-icon-action { color: #c5c5c5; background: transparent; border: 0; border-radius: 5px; cursor: pointer; }
  .editor-action { padding: 5px 8px; font: 500 10px/1.2 var(--font-sans); }
  .editor-icon-action { width: 26px; height: 26px; }
  .editor-action:hover, .editor-icon-action:hover { background: #37373d; color: #fff; }
  .editor-action:focus-visible, .editor-icon-action:focus-visible { outline: 2px solid #3794ff; outline-offset: 1px; }
  .editor-status { background: #007acc; color: #fff; }
  :global(.cm-editor) { height: 100%; }
  :global(.cm-editor) { background: var(--editor-bg); color: var(--editor-text); }
  :global(.cm-editor .cm-scroller) { font-family: "JetBrains Mono", monospace; line-height: 1.6; }
  :global(.cm-editor .cm-gutters) { background: #1e1e1e; border-right: 1px solid var(--editor-border); color: #858585; }
  :global(.cm-editor .cm-activeLineGutter) { background: #2a2d2e; color: #c6c6c6; }
  :global(.cm-editor .cm-activeLine) { background: rgb(255 255 255 / 0.035); }
  :global(.cm-editor .cm-cursor) { display: none; }
</style>
