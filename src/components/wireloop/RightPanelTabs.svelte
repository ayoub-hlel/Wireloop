<script lang="ts">
  import VerticalComponentContainer from './VerticalComponentContainer.svelte';
  import Simulator from './home/Simulator.svelte';
  import Step from './home/Steps.svelte';
  import Debug from './arduino/Debug.svelte';
  import Message from './arduino/Message.svelte';
  import CodeEditor from './home/CodeEditor.svelte';
  import codeStore from '../../stores/code.store';
  import { get } from 'svelte/store';
  import { page } from '$app/stores';
  import { workspaceToXML } from '../../core/blockly/helpers/workspace.helper';
  import { tooltip } from '$lib/tooltip';

  type TabId = 'emulator' | 'code' | 'upload';

  const initialView = get(page).url.searchParams.get('view');
  let activeTab = $state<TabId>(initialView === 'code' ? 'code' : 'emulator');

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
  <div class="tab-content" role="tabpanel" id="studio-panel-{activeTab}" aria-labelledby="studio-tab-{activeTab}" tabindex="0">
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
      <CodeEditor />

    {:else if activeTab === 'upload'}
      <div class="h-full overflow-y-auto flex flex-col">
        <Message />
        <Debug />
      </div>
    {/if}
  </div>

  <!-- Tab Bar -->
  <div class="tab-bar">
    <div class="tab-nav" role="tablist" aria-label="Studio views">
      <button id="studio-tab-emulator" role="tab" aria-selected={activeTab === 'emulator'} aria-controls="studio-panel-emulator" class={tabClass('emulator')} onclick={() => activeTab = 'emulator'}>
        <i class="fa fa-microchip"></i>
        <span>Emulator</span>
      </button>
      <button id="studio-tab-code" role="tab" aria-selected={activeTab === 'code'} aria-controls="studio-panel-code" class={tabClass('code')} onclick={() => activeTab = 'code'}>
        <i class="fa fa-code"></i>
        <span>Code</span>
      </button>
      <button id="studio-tab-upload" role="tab" aria-selected={activeTab === 'upload'} aria-controls="studio-panel-upload" class={tabClass('upload')} onclick={() => activeTab = 'upload'}>
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
        aria-label="Download Arduino code"
        onclick={downloadIno}
        class="download-fab"
      >
        <i class="fa fa-download"></i>
      </button>
      <button
        use:tooltip={{position: "left", theme: "nav-tooltip"}}
        title="Download project file"
        aria-label="Download project file"
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
    background: hsl(var(--card));
  }

  .tab-content {
    flex: 1;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
    background: hsl(var(--background));
  }

  .slot-wrapper {
    height: 100%;
    width: 100%;
    overflow: hidden;
  }

  .tab-bar {
    flex-shrink: 0;
    border-top: 1px solid hsl(var(--border));
    background: hsl(var(--card));
    padding: 8px;
  }

  .tab-nav {
    display: flex;
    width: 100%;
    gap: 4px;
  }

  .tab-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 9px 8px;
    background: none;
    border: none;
    border-radius: 8px;
    color: hsl(var(--muted-foreground));
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    letter-spacing: 0.02em;
    text-transform: none;
  }

  .tab-btn:hover {
    color: hsl(var(--foreground));
    background: hsl(var(--foreground) / 0.06);
  }

  .tab-btn:focus-visible {
    position: relative;
    z-index: 1;
    outline: 2px solid hsl(var(--ring));
    outline-offset: -2px;
  }

  .tab-btn.active {
    color: hsl(var(--primary-foreground));
    background: hsl(var(--primary));
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.12);
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
    border-radius: 10px;
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

  .download-fab:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
  }

  .download-fab-sm {
    width: 30px;
    height: 30px;
    font-size: 12px;
  }
</style>
