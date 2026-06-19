<script lang="ts">
  import arduionMessageStore from "../../../stores/arduino-message.store";
  import codeStore from "../../../stores/code.store";
  import arduinoStore, { PortState } from "../../../stores/arduino.store";
  import { upload } from "../../../core/serial/upload";
  import { afterUpdate } from "svelte";
  import { getBoard } from "../../../core/microcontroller/selectBoard";
  import { onErrorMessage, onSuccess } from "../../../help/alerts";
  import { tooltip } from "@svelte-plugins/tooltips";
  import type { MicroControllerType } from "../../../core/microcontroller/microcontroller";

  const navigatorSerialNotAvailableMessaeg = `To upload code you must use chrome or a chromium based browser like edge, or brave.  This will work with chrome version 89 or higher. `;

  let autoScroll = false;
  let messages: any[] = [];
  let arduinoStatus = PortState.CLOSE;
  let messageToSend = "";
  let code = "";
  let boardType: MicroControllerType;
  let messagesEl: HTMLElement;

  $: uploadingClass = arduinoStatus === PortState.UPLOADING ? "fa-spinner fa-spin" : "fa-upload";

  codeStore.subscribe((codeInfo) => {
    code = codeInfo.code;
    boardType = codeInfo.boardType;
  });

  arduinoStore.subscribe((status) => { arduinoStatus = status; });

  arduionMessageStore.subscribe((newMessage) => {
    if (!newMessage) return;
    if (newMessage.message.includes("C_D_B_C_D")) { arduionMessageStore.sendMessage("START_DEBUG"); }
    if (
      newMessage.message.includes("**(|)") ||
      newMessage.message.includes("DEBUG_BLOCK_") ||
      newMessage.message.includes("stop_debug") ||
      newMessage.message.includes("continue_debug") ||
      newMessage.message.includes("START_DEBUG") ||
      newMessage.message.includes("C_D_B_C_D")
    ) return;

    messages = [...messages, newMessage];
  });

  async function connectOrDisconnectArduino() {
    if (!(navigator as any).serial) {
      onErrorMessage(navigatorSerialNotAvailableMessaeg, new Error("Web Serial not available"));
      return;
    }

    if (arduinoStatus == PortState.OPEN) {
      arduinoStore.set(PortState.CLOSING);
      try { await arduionMessageStore.closePort(); } catch (e: any) {
        onErrorMessage("Sorry, error with the arduino. Please refresh your browser to disconnect.", e);
      }
      arduinoStore.set(PortState.CLOSE);
      return;
    }
    arduinoStore.set(PortState.OPENNING);
    const board = getBoard(boardType);
    arduionMessageStore.connect(board.serial_baud_rate).then(() => {
      arduinoStore.set(PortState.OPEN);
    }).catch((e) => {
      arduinoStore.set(PortState.CLOSE);
      if (e.message.toLowerCase() !== "no port selected by the user.") {
        onErrorMessage("Sorry, please refresh your browser and try again.", e);
      }
    });
  }

  function sendMessage() {
    if (arduinoStatus !== PortState.OPEN || !messageToSend.trim()) return;
    try {
      arduionMessageStore.sendMessage(messageToSend);
      messageToSend = "";
    } catch (e: any) { console.log(e, "sendMessage error"); }
  }

  async function uploadCode() {
    if (!(navigator as any).serial) {
      onErrorMessage(navigatorSerialNotAvailableMessaeg, new Error("Web Serial not available"));
      return;
    }
    if (arduinoStatus !== PortState.CLOSE) return;
    arduinoStore.set(PortState.UPLOADING);
    try {
      const avrgirl = new (window as any).AvrgirlArduino({ board: boardType, debug: true });
      await upload(code, avrgirl, boardType);
      onSuccess("Your code is uploaded!! :)");
    } catch (e: any) {
      if (e.message.toLowerCase() === "no port selected by the user.") {
        arduinoStore.set(PortState.CLOSE);
        return;
      }
      onErrorMessage("Sorry, please try again in 5 minutes. :)", e);
    }
    arduinoStore.set(PortState.CLOSE);
  }
  
  function clearMessages() { messages = []; }

  afterUpdate(() => {
    if (autoScroll && messagesEl) { messagesEl.scrollTop = messagesEl.scrollHeight; }
  });

  const tooltipStyle = { position: "top", theme: "nav-tooltip" };
</script>

<div class="flex flex-col h-full bg-bg">
  <div class="p-3 border-b border-border bg-bg-surface flex items-center justify-between">
    <div class="flex items-center space-x-3">
      <div class="pin-label">UART_0</div>
      <h2 class="text-xs font-mono font-bold text-primary uppercase tracking-widest">Serial Console</h2>
    </div>
    
    <div class="flex items-center space-x-4">
      <div class="flex items-center space-x-2">
        <span class="led" class:led-green={arduinoStatus === PortState.OPEN} class:led-off={arduinoStatus === PortState.CLOSE} class:led-blue={arduinoStatus === PortState.UPLOADING}></span>
        <span class="font-mono text-[10px] uppercase opacity-60">
          {#if arduinoStatus === PortState.OPEN}LINK_ESTABLISHED{:else if arduinoStatus === PortState.UPLOADING}SYNC_IN_PROGRESS{:else}NO_LINK{/if}
        </span>
      </div>
    </div>
  </div>

  <section 
    bind:this={messagesEl} 
    id="messages" 
    class="flex-grow p-4 overflow-y-auto font-mono text-xs space-y-1 bg-grid-schematic-dense"
    style="background-size: 12px 12px;"
  >
    {#each messages as mes (mes.id)}
      <div class="flex items-start space-x-2 opacity-90 hover:opacity-100 transition-opacity">
        <span class="text-[10px] text-text-muted mt-0.5">[{mes.time}]</span>
        <span class={mes.type === 'Computer' ? 'text-primary' : 'text-success'}>
          {mes.type === 'Computer' ? '>>' : '<<'}
        </span>
        <span class="break-all">{mes.message}</span>
      </div>
    {/each}
    {#if messages.length === 0}
      <div class="h-full flex items-center justify-center text-text-subtle font-mono uppercase tracking-[0.2em] text-[10px] animate-pulse">
        Waiting for serial data...
      </div>
    {/if}
  </section>

  <div class="p-4 border-t border-border bg-bg-surface shadow-card">
    <div class="flex items-center space-x-2">
      <div class="flex-grow relative">
        <form on:submit|preventDefault={sendMessage}>
          <input
            readonly={!(arduinoStatus === PortState.OPEN)}
            type="text"
            bind:value={messageToSend}
            placeholder={arduinoStatus === PortState.OPEN ? "TERMINAL_INPUT >" : "CONNECT_PORT_FIRST"}
            class="input-schematic w-full pl-3 pr-10 uppercase !bg-bg/50"
          />
        </form>
        <button 
          disabled={!(arduinoStatus === PortState.OPEN)}
          on:click={sendMessage}
          class="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-primary hover:text-primary-glow disabled:text-text-subtle transition-colors"
          aria-label="Send message"
        >
          <i class="fa fa-paper-plane"></i>
        </button>
      </div>

      <div class="flex items-center space-x-2 border-l border-border pl-4 ml-2">
        <button
          use:tooltip={tooltipStyle}
          title={arduinoStatus === PortState.OPEN ? "Disconnect" : "Connect"}
          on:click={connectOrDisconnectArduino}
          class="btn-schematic !w-10 !h-10 p-0 flex items-center justify-center"
          class:!border-danger={arduinoStatus === PortState.OPEN}
          class:!text-danger={arduinoStatus === PortState.OPEN}
        >
          <i class="fa text-lg" class:fa-plug={arduinoStatus === PortState.CLOSE} class:fa-unlink={arduinoStatus === PortState.OPEN}></i>
        </button>

        <button
          use:tooltip={tooltipStyle}
          title="Upload to Hardware"
          disabled={!(arduinoStatus === PortState.CLOSE)}
          on:click={uploadCode}
          class="btn-schematic !w-10 !h-10 p-0 flex items-center justify-center"
        >
          <i class="fa text-lg {uploadingClass}"></i>
        </button>

        <button 
          use:tooltip={tooltipStyle} 
          title="Clear Buffer" 
          on:click={clearMessages}
          class="btn-schematic !w-10 !h-10 p-0 flex items-center justify-center"
        >
          <i class="fa fa-trash text-lg"></i>
        </button>

        <button
          use:tooltip={tooltipStyle}
          title="Toggle Auto-Scroll"
          on:click={() => autoScroll = !autoScroll}
          class="btn-schematic !w-10 !h-10 p-0 flex items-center justify-center transition-all"
          class:!bg-primary={autoScroll}
          class:!text-bg={autoScroll}
        >
          <i class="fa fa-angle-double-down text-lg"></i>
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  #messages::-webkit-scrollbar { width: 6px; }
  #messages::-webkit-scrollbar-track { background: #0A0E14; }
  #messages::-webkit-scrollbar-thumb {
    background: #1E3A5F;
    border-radius: 2px;
  }
  #messages::-webkit-scrollbar-thumb:hover { background: #2563EB; }
</style>
