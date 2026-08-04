<script lang="ts">
  import { onMount } from "svelte";
  import codeStore from "../../../stores/code.store";
  import hljs from 'highlight.js/lib/core';
  import arduinoLang from 'highlight.js/lib/languages/arduino';
  import 'highlight.js/styles/arduino-light.css';
  import { tooltip } from "$lib/tooltip";
  import { get } from "svelte/store";

  let code = $state("");
  let loaded = $state(false);
  let fontSize = $state(14);
  let hasCopiedCode = $state(false);

  onMount(async () => {
    hljs.registerLanguage('arduino', arduinoLang);
    codeStore.subscribe(async (codeInfo) => {
      try {
        code = hljs.highlight(codeInfo.code, { language: 'arduino' }).value;
      } catch(e) {
        console.log(e);
      }
    });
    loaded = true;
  });

  $effect.pre(() => {
    if (loaded) {
      try {
        hljs.highlightAll();
      } catch (error) {
        console.log(error, 'error')
      }
    }
  });

  function zoomIn() { fontSize += 2; }
  function zoomOut() { fontSize -= 2; }
  function copy() {
    navigator.clipboard.writeText(get(codeStore).code);
    hasCopiedCode = true;
  }

  const tooltipStyle = {
    position: "bottom",
    align: "center",
    animation: "slide",
    theme: "nav-tooltip",
  };
</script>

<div class="flex flex-col h-full bg-bg">
  <div class="flex items-center justify-between p-4 border-b border-border bg-bg-surface shadow-card">
    <div class="flex items-center space-x-3">
      <div class="pin-label">SRC_GEN_V3</div>
      <h2 class="text-sm font-mono font-bold text-primary tracking-widest uppercase">Arduino Output Stream</h2>
    </div>
    
    <div class="flex items-center space-x-2">
      <button 
        use:tooltip={tooltipStyle} 
        title={hasCopiedCode ? "Copied!" : "Copy Source"} 
        onclick={copy}
        onmouseleave={() => hasCopiedCode = false}
        class="btn-schematic flex items-center space-x-2"
      >
        <i class="fa fa-clipboard"></i>
        <span class="text-[10px]">{hasCopiedCode ? 'DATA_SYNC_OK' : 'COPY_BUFFER'}</span>
      </button>

      <div class="trace-divider w-8 mx-2 rotate-90"></div>

      <button onclick={zoomOut} use:tooltip={tooltipStyle} title="Decrease Font" class="btn-schematic p-2 w-9 h-9 flex items-center justify-center">
        <i class="fa fa-search-minus"></i>
      </button>
      <button onclick={zoomIn} use:tooltip={tooltipStyle} title="Increase Font" class="btn-schematic p-2 w-9 h-9 flex items-center justify-center">
        <i class="fa fa-search-plus"></i>
      </button>
    </div>
  </div>

  <div class="flex-grow overflow-hidden relative">
    <div class="absolute inset-0 bg-grid-schematic opacity-5 pointer-events-none"></div>
    <pre class="p-6 h-full overflow-auto font-mono selection:bg-primary/20" style="font-size: {fontSize}px">
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html code}
    </pre>
  </div>
</div>

<svelte:head>
  <title>AWB | Source Code</title>
</svelte:head>

<style>
  :global(.hljs) {
    background: transparent !important;
    color: #E2E8F0 !important;
  }
  :global(.hljs-keyword) { color: hsl(var(--primary)) !important; }
  :global(.hljs-string) { color: hsl(var(--success)) !important; }
  :global(.hljs-comment) { color: hsl(var(--muted-foreground)) !important; }
  :global(.hljs-number) { color: hsl(var(--warning)) !important; }
  :global(.hljs-function) { color: hsl(var(--primary)) !important; }
  
  pre::-webkit-scrollbar { width: 6px; }
  pre::-webkit-scrollbar-track { background: hsl(var(--background)); }
  pre::-webkit-scrollbar-thumb {
    background: hsl(var(--border));
    border-radius: var(--radius);
  }
  pre::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground)); }
</style>
