<script lang="ts">
  import arduinoStore, { PortState } from "../../../stores/arduino.store";
  import arduionMessageStore from "../../../stores/arduino-message.store";
  import { rgbToHex } from "../../../core/blockly/helpers/color.helper";

  let variables: { name: string; type: string; value: string }[] = $state([]);
  let tempVariables: { name: string; type: string; value: string }[] = $state([]);
  let portStatus: PortState = $state(PortState.CLOSE);
  let inDebugStatement = $state(false);
  let debugStart = $state(false);

  arduinoStore.subscribe((newPortStatus) => {
    portStatus = newPortStatus;
    if (portStatus === PortState.CLOSE) { debugStart = false; }
  });

  arduionMessageStore.subscribe((message) => {
    if (!message) return;
    if (message.message.includes("START_DEBUG")) { debugStart = true; }
    if (message.type === "Computer") return;
    if (message.message.includes("DEBUG_BLOCK_")) {
      variables = [...tempVariables];
      tempVariables = [];
      inDebugStatement = true;
      return;
    }
    if (!message.message.includes("**(|)")) return;

    const [name, type, value] = message.message.replace("**(|)", "").split("_|_");
    const varIndex = tempVariables.findIndex((v) => v.name === name);
    if (varIndex > -1) {
      tempVariables[varIndex] = { name, type, value };
      return;
    }
    tempVariables.push({ name, type, value });
  });

  function colorValueString(colorString: string) {
    const [red, green, blue] = colorString.replace("{", "").replace("}", "").split("-").map((colorNum: string) => parseInt(colorNum, 10));
    return `(${red},${green},${blue})`;
  }

  function colorValueHex(colorString: string) {
    const [red, green, blue] = colorString.replace("{", "").replace("}", "").split("-").map((colorNum: string) => parseInt(colorNum, 10));
    return rgbToHex({ red, green, blue });
  }

  function parseColorList(colorListString: string) {
    return colorListString.replace("[", "").replace("]", "").split(",").map((colorString) => {
      const [red, green, blue] = colorString.replace("{", "").replace("}", "").split("-").map((colorNum) => parseInt(colorNum, 10));
      return { red, green, blue };
    });
  }

  let disableDebugBtn = $derived((portStatus as PortState) !== PortState.OPEN || !inDebugStatement);

  function continueDebug() {
    if (inDebugStatement) {
      arduionMessageStore.sendMessage("continue_debug");
      inDebugStatement = false;
    }
  }

  function stopDebug() {
    if (inDebugStatement) {
      arduionMessageStore.sendMessage("stop_debug");
      inDebugStatement = false;
    }
  }
</script>

<div class="flex flex-col bg-bg-surface">
  <div class="p-3 border-b border-border bg-bg flex items-center justify-between">
    <div class="flex items-center space-x-3">
      <div class="pin-label">DBG_CH_1</div>
      <h2 class="text-xs font-mono font-bold text-primary uppercase tracking-widest">Logic Analyzer</h2>
    </div>
    
    <div class="flex items-center space-x-2">
      <button 
        onclick={continueDebug} 
        disabled={disableDebugBtn}
        aria-label="Continue execution"
        class="btn-schematic !w-9 !h-9 p-0 flex items-center justify-center group"
        title="Continue Execution"
      >
        <i class="fa fa-play text-sm group-hover:scale-110 transition-transform"></i>
      </button>
      <button 
        onclick={stopDebug} 
        disabled={disableDebugBtn}
        aria-label="Halt execution"
        class="btn-schematic !w-9 !h-9 p-0 flex items-center justify-center !border-danger !text-danger group"
        title="Halt Execution"
      >
        <i class="fa fa-stop text-sm group-hover:scale-110 transition-transform"></i>
      </button>
      <div class="w-[1px] h-6 bg-border mx-1"></div>
      <div class="flex items-center space-x-2 px-2">
        <span class="led" class:led-green={debugStart} class:led-off={!debugStart}></span>
        <span class="font-mono text-[10px] uppercase opacity-50">{debugStart ? 'CORE_ATTACHED' : 'IDLE'}</span>
      </div>
    </div>
  </div>

  <div class="p-4 bg-grid-schematic-dense" style="background-size: 12px 12px;">
    <div class="card-schematic overflow-hidden">
      <table class="w-full text-left font-mono text-xs border-collapse">
        <thead>
          <tr class="bg-bg border-b border-border">
            <th class="p-3 text-primary uppercase tracking-tighter border-r border-border w-1/3">Register / Var</th>
            <th class="p-3 text-primary uppercase tracking-tighter border-r border-border w-1/4">Type</th>
            <th class="p-3 text-primary uppercase tracking-tighter">Current Value</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border/50">
          {#each variables as variable (variable.name)}
            <tr class="hover:bg-primary/5 transition-colors group">
              <td class="p-3 border-r border-border font-bold text-text group-hover:text-primary transition-colors">{variable.name}</td>
              <td class="p-3 border-r border-border text-text-muted italic">{variable.type}</td>
              <td class="p-3">
                {#if variable.type === 'Colour'}
                  <div class="flex items-center space-x-2">
                    <div class="w-4 h-4 rounded-sm border border-border shadow-sm" style="background-color: {colorValueHex(variable.value)}"></div>
                    <span class="text-primary font-bold">{colorValueString(variable.value)}</span>
                  </div>
                {:else if variable.type === 'List Colour'}
                  <div class="flex flex-wrap gap-1">
                    {#each parseColorList(variable.value) as colorValue, ci (ci)}
                      <div class="w-3 h-3 rounded-sm border border-border shadow-sm" style="background-color: {rgbToHex(colorValue)}" title={rgbToHex(colorValue)}></div>
                    {/each}
                  </div>
                {:else}
                  <span class="data-readout py-0.5 px-2 !bg-transparent !border-none !shadow-none">{variable.value}</span>
                {/if}
              </td>
            </tr>
          {/each}
          {#if variables.length === 0}
            <tr>
              <td colspan="3" class="p-12 text-center text-text-subtle font-mono uppercase tracking-[0.3em] text-[10px]">
                No active data streams detected.
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>
