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
  import ContextMenu from "./ContextMenu.svelte";

  let container: HTMLElement;
  let editorView: EditorView | undefined = $state();
  let loaded = $state(false);
  let fontSize = $state(14);
  let cursorLine = $state(1);
  let cursorCol = $state(1);
  let userEdited = $state(false);
  let hasCopied = $state(false);

  // Context menu state
  let ctxShow = $state(false);
  let ctxX = $state(0);
  let ctxY = $state(0);

  function makeEditor(doc: string) {
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        userEdited = true;
        const val = update.state.doc.toString();
        codeStore.set({ code: val, boardType: codeStore.currentBoard });
      }
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
    loaded = true;

    const unsub = codeStore.subscribe((info) => {
      if (!userEdited && editorView) {
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

  function copyCode() {
    navigator.clipboard.writeText(get(codeStore).code);
    hasCopied = true;
  }

  function syncFromBlocks() {
    userEdited = false;
    if (!editorView) return;
    const info = get(codeStore);
    const current = editorView.state.doc.toString();
    if (current !== info.code) {
      editorView.dispatch({
        changes: { from: 0, to: current.length, insert: info.code },
      });
    }
  }

  function onCtxAction(cmd: string) {
    ctxShow = false;
    if (cmd === "__close__") return;
    if (!editorView) return;
    const v = editorView;

    switch (cmd) {
      case "cut": document.execCommand("cut"); break;
      case "copy": document.execCommand("copy"); break;
      case "paste":
        navigator.clipboard.readText().then(t => v.dispatch(v.state.replaceSelection(t)));
        break;
      case "selectAll":
        v.dispatch({ selection: { anchor: 0, head: v.state.doc.length } });
        break;
      case "duplicateLine": {
        const pos = v.state.selection.main;
        const line = v.state.doc.lineAt(pos.head);
        v.dispatch({ changes: { from: line.to, insert: line.text + "\n" } });
        break;
      }
      case "toggleComment": {
        const pos = v.state.selection.main;
        const line = v.state.doc.lineAt(pos.head);
        const trimmed = line.text.trim();
        if (trimmed.startsWith("//")) {
          const indent = line.text.match(/^\s*/)?.[0] || "";
          v.dispatch({ changes: { from: line.from, to: line.to, insert: indent + trimmed.slice(2) } });
        } else {
          v.dispatch({ changes: { from: line.from, insert: "// " } });
        }
        break;
      }
      case "find":
        v.focus();
        break;
      case "gotoLine": {
        const lineStr = prompt("Go to line:");
        if (lineStr) {
          const ln = parseInt(lineStr, 10);
          if (!isNaN(ln) && ln > 0 && ln <= v.state.doc.lines) {
            const line = v.state.doc.line(ln);
            v.dispatch({ selection: { anchor: line.from }, scrollIntoView: true });
          }
        }
        break;
      }
    }
  }

  function onContextMenu(e: MouseEvent) {
    e.preventDefault();
    ctxX = e.clientX;
    ctxY = e.clientY;
    ctxShow = true;
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="flex flex-col flex-1 min-h-0 bg-bg" oncontextmenu={onContextMenu} role="region" aria-label="Code Editor">
  <!-- Toolbar -->
  <div class="flex items-center justify-between px-2 py-1 border-b border-border bg-bg-surface shrink-0">
    <div class="flex items-center gap-1.5 min-w-0">
      <div class="pin-label text-[9px] leading-none shrink-0">SRC_GEN_V3</div>
      <h2 class="text-[9px] font-mono font-bold text-primary tracking-widest uppercase truncate leading-none">Arduino Code</h2>
      {#if userEdited}
        <span class="text-[8px] text-warning font-mono">● mod</span>
      {/if}
    </div>
    <div class="flex items-center gap-0.5 shrink-0">
      <button onclick={syncFromBlocks} class="btn-schematic flex items-center gap-1 text-[9px] px-1.5 py-0.5" title="Sync from blocks">
        <i class="fa fa-refresh text-[9px]"></i>
        <span class="hidden sm:inline">SYNC</span>
      </button>
      <div class="w-3 h-3 border-r border-border mx-0.5 rotate-90 shrink-0"></div>
      <button onclick={copyCode} class="btn-schematic flex items-center gap-1 text-[9px] px-1.5 py-0.5" title={hasCopied ? "Copied!" : "Copy"}>
        <i class="fa fa-clipboard text-[9px]"></i>
        <span class="hidden sm:inline">{hasCopied ? 'OK' : 'COPY'}</span>
      </button>
      <div class="w-3 h-3 border-r border-border mx-0.5 rotate-90 shrink-0"></div>
      <button onclick={zoomOut} class="btn-schematic p-1 w-5 h-5 flex items-center justify-center shrink-0" title="Decrease Font">
        <i class="fa fa-search-minus text-[8px]"></i>
      </button>
      <button onclick={zoomIn} class="btn-schematic p-1 w-5 h-5 flex items-center justify-center shrink-0" title="Increase Font">
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
  <div class="flex items-center justify-between px-3 py-1 border-t border-border bg-bg-surface text-[10px] text-text-muted font-mono shrink-0">
    <div class="flex items-center gap-3">
      <span>Ln {cursorLine}, Col {cursorCol}</span>
      {#if userEdited}
        <span class="text-warning">● modified</span>
      {:else}
        <span class="text-success">● synced</span>
      {/if}
    </div>
    <div class="flex items-center gap-2">
      <span>UTF-8</span>
      <span>Arduino C++</span>
    </div>
  </div>
</div>

<ContextMenu show={ctxShow} x={ctxX} y={ctxY} onAction={onCtxAction} />

<style>
  :global(.cm-editor) { height: 100%; }
  :global(.cm-editor .cm-scroller) { font-family: "JetBrains Mono", monospace; line-height: 1.6; }
</style>
