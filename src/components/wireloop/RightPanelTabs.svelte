<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import VerticalComponentContainer from './VerticalComponentContainer.svelte';
  import Simulator from './home/Simulator.svelte';
  import Step from './home/Steps.svelte';
  import Debug from './arduino/Debug.svelte';
  import Message from './arduino/Message.svelte';
  import codeStore from '../../stores/code.store';
  import hljs from 'highlight.js/lib/core';
  import arduinoLang from 'highlight.js/lib/languages/arduino';
  import 'highlight.js/styles/arduino-light.css';
  import { tooltip } from '$lib/tooltip';
  import { get } from 'svelte/store';
  import { workspaceToXML } from '../../core/blockly/helpers/workspace.helper';

  type TabId = 'emulator' | 'code' | 'upload';

  let activeTab = $state<TabId>('emulator');
  let fontSize = $state(14);
  let hasCopiedCode = $state(false);
  let highlightedCode = $state('');
  let codeLoaded = $state(false);

  const tooltipStyle = {
    position: "bottom",
    align: "center",
    animation: "slide",
    theme: "nav-tooltip",
  };

  // --- Code tab logic (ported from code/+page.svelte) ---
  onMount(async () => {
    hljs.registerLanguage('arduino', arduinoLang);
    codeStore.subscribe((codeInfo) => {
      try {
        // @ts-ignore
        highlightedCode = hljs.highlight(codeInfo.code, { language: 'arduino' }).value;
      } catch(e) {
        console.log(e);
      }
    });
    codeLoaded = true;
  });

  $effect.pre(() => {
    if (codeLoaded && activeTab === 'code') {
      try {
        hljs.highlightAll();
      } catch (error) {
        console.log(error, 'error');
      }
    }
  });

  function zoomIn() { fontSize += 2; }
  function zoomOut() { fontSize -= 2; }
  function copyCode() {
    navigator.clipboard.writeText(get(codeStore).code);
    hasCopiedCode = true;
  }

  // --- Download logic (ported from download/+page.svelte) ---
  function downloadIno() {
    const code = get(codeStore).code || '';
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    saveAs(blob, "arduino_workflow_builder_code.ino");
  }

  function downloadProject() {
    const blob = new Blob([workspaceToXML() || ''], {
      type: "application/xml;charset=utf-8",
    });
    saveAs(blob, "arduino_workflow_builder_project.xml");
  }

  function saveAs(blob: Blob, filename: string) {
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);
  }

  function tabClass(tab: TabId) {
    return activeTab === tab ? 'tab-btn active' : 'tab-btn';
  }
</script>

<div class="panel-layout">
  <!-- Tab Content Area -->
  <div class="tab-content">
    {#if activeTab === 'emulator'}
      <VerticalComponentContainer>
        {#snippet top()}
          <div class="slot-wrapper">
            <Simulator />
          </div>
        {/snippet}
        {#snippet bottom()}
          <div class="slot-wrapper">
            <Step />
          </div>
        {/snippet}
      </VerticalComponentContainer>

    {:else if activeTab === 'code'}
      <div class="flex flex-col flex-1 min-h-0 bg-bg">
        <div class="flex items-center justify-between p-3 border-b border-border bg-bg-surface shadow-card shrink-0">
          <div class="flex items-center space-x-3 min-w-0">
            <div class="pin-label shrink-0">SRC_GEN_V3</div>
            <h2 class="text-xs font-mono font-bold text-primary tracking-widest uppercase truncate">Arduino Output Stream</h2>
          </div>
          <div class="flex items-center space-x-1 shrink-0">
            <button
              use:tooltip={tooltipStyle}
              title={hasCopiedCode ? "Copied!" : "Copy Source"}
              onclick={copyCode}
              onmouseleave={() => hasCopiedCode = false}
              class="btn-schematic flex items-center space-x-1 text-[10px]"
            >
              <i class="fa fa-clipboard"></i>
              <span class="hidden sm:inline">{hasCopiedCode ? 'DATA_SYNC_OK' : 'COPY_BUFFER'}</span>
            </button>
            <div class="trace-divider w-4 mx-0.5 rotate-90 shrink-0"></div>
            <button onclick={zoomOut} use:tooltip={tooltipStyle} title="Decrease Font" class="btn-schematic p-1.5 w-7 h-7 flex items-center justify-center shrink-0">
              <i class="fa fa-search-minus"></i>
            </button>
            <button onclick={zoomIn} use:tooltip={tooltipStyle} title="Increase Font" class="btn-schematic p-1.5 w-7 h-7 flex items-center justify-center shrink-0">
              <i class="fa fa-search-plus"></i>
            </button>
          </div>
        </div>
        <div class="flex-1 min-h-0 relative">
          <div class="absolute inset-0 bg-grid-schematic opacity-5 pointer-events-none"></div>
          <pre class="absolute inset-0 p-4 overflow-auto font-mono selection:bg-primary/20" style="font-size: {fontSize}px">
            <code class="language-arduino !bg-transparent !p-0 block">{@html highlightedCode}</code>
          </pre>
        </div>
      </div>

    {:else if activeTab === 'upload'}
      <VerticalComponentContainer>
        {#snippet top()}
          <div class="slot-wrapper">
            <Message />
          </div>
        {/snippet}
        {#snippet bottom()}
          <div class="slot-wrapper">
            <Debug />
          </div>
        {/snippet}
      </VerticalComponentContainer>
    {/if}
  </div>

  <!-- Tab Bar -->
  <div class="tab-bar">
    <div class="tab-nav">
      <button class={tabClass('emulator')} onclick={() => activeTab = 'emulator'}>
        <i class="fa fa-microchip"></i>
        <span>Emulator</span>
      </button>
      <button class={tabClass('code')} onclick={() => activeTab = 'code'}>
        <i class="fa fa-code"></i>
        <span>Code</span>
      </button>
      <button class={tabClass('upload')} onclick={() => activeTab = 'upload'}>
        <i class="fa fa-upload"></i>
        <span>Upload</span>
      </button>
    </div>
  </div>

  <!-- Download FAB — shown on emulator and code tabs -->
  {#if activeTab === 'emulator' || activeTab === 'code'}
    <div class="download-fab-group">
      <button
        use:tooltip={{position: "left", theme: "nav-tooltip"}}
        title="Download .ino code"
        onclick={downloadIno}
        class="download-fab"
      >
        <i class="fa fa-download"></i>
      </button>
      <button
        use:tooltip={{position: "left", theme: "nav-tooltip"}}
        title="Download project file"
        onclick={downloadProject}
        class="download-fab download-fab-sm"
      >
        <i class="fa fa-file-archive-o"></i>
      </button>
    </div>
  {/if}
</div>

<style>
  .panel-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
    position: relative;
    min-width: 0;
  }

  .tab-content {
    flex: 1;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .slot-wrapper {
    height: 100%;
    width: 100%;
    overflow: hidden;
  }

  .tab-bar {
    flex-shrink: 0;
    border-top: 1px solid hsl(var(--border));
    background: hsl(var(--background));
    padding: 0;
  }

  .tab-nav {
    display: flex;
    width: 100%;
  }

  .tab-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 8px;
    background: none;
    border: none;
    border-top: 2px solid transparent;
    color: hsl(var(--muted-foreground));
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .tab-btn:hover {
    color: hsl(var(--foreground));
    background: hsl(var(--accent) / 0.05);
  }

  .tab-btn.active {
    color: hsl(var(--primary));
    border-top-color: hsl(var(--primary));
    background: hsl(var(--primary) / 0.05);
  }

  .tab-btn i {
    font-size: 13px;
  }

  .download-fab-group {
    position: absolute;
    bottom: 56px;
    right: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    z-index: 20;
  }

  .download-fab {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 1px solid hsl(var(--border));
    background: hsl(var(--background));
    color: hsl(var(--primary));
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    transition: all 0.15s;
    font-size: 15px;
  }

  .download-fab:hover {
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    transform: translateY(-1px);
  }

  .download-fab-sm {
    width: 30px;
    height: 30px;
    font-size: 12px;
  }
</style>
