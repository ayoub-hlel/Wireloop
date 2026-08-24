/**
 * Bluetooth block regression (setup / send_message) — rewritten against the
 * shared harness. Every assertion from the original bespoke file is preserved.
 */
import { describe, it, beforeEach, afterEach, expect } from "vitest";
import type { Workspace, BlockSvg } from "blockly";

import { ARDUINO_PINS } from "@/core/microcontroller/selectBoard";
import { saveSensorSetupBlockData } from "@/core/blockly/actions/saveSensorSetupBlockData";
import { updater } from "@/core/blockly/updater";
import {
  ArduinoFrame,
  ArduinoComponentType,
} from "@/core/frames/arduino.frame";
import {
  createArduinoAndWorkSpace,
  createTestEvent,
} from "../../app/tests.helper";
import { eventToFrameFactory } from "@/core/frames/event-to-frame.factory";
import type { BluetoothState } from "@/blocks/bluetooth/state";
import { stack, framesFor } from "../_harness/block.harness";

const setupBluetoothBlock = (ws: Workspace): BlockSvg => {
  const btSetup = ws.newBlock("bluetooth_setup") as BlockSvg;
  btSetup.setFieldValue(ARDUINO_PINS.PIN_7, "PIN_RX");
  btSetup.setFieldValue(ARDUINO_PINS.PIN_6, "PIN_TX");
  return btSetup;
};

describe("bluetooth blocks", () => {
  let ws: Workspace;
  let arduinoBlock: BlockSvg;
  let bluetoothSetupBlock: BlockSvg;

  afterEach(() => {
    ws.dispose();
  });

  describe("bluetooth_setup state", () => {
    beforeEach(() => {
      [ws, arduinoBlock] = createArduinoAndWorkSpace();
      bluetoothSetupBlock = setupBluetoothBlock(ws);
      bluetoothSetupBlock.setFieldValue("TRUE", "receiving_message");
      bluetoothSetupBlock.setFieldValue("hello world", "message");

      saveSensorSetupBlockData(createTestEvent(bluetoothSetupBlock.id)).forEach(
        updater,
      );
    });

    it("generates the exact pre-setup frame for the bluetooth component", () => {
      const event = createTestEvent(bluetoothSetupBlock.id);

      const btComponent: BluetoothState = {
        pins: [ARDUINO_PINS.PIN_6, ARDUINO_PINS.PIN_7],
        rxPin: ARDUINO_PINS.PIN_7,
        txPin: ARDUINO_PINS.PIN_6,
        hasMessage: true,
        message: "hello world",
        sendMessage: "",
        type: ArduinoComponentType.BLUE_TOOTH,
      };

      const state: ArduinoFrame = {
        blockId: bluetoothSetupBlock.id,
        blockName: "bluetooth_setup",
        timeLine: { function: "pre-setup", iteration: 0 },
        explanation: "Setting up Bluetooth.",
        components: [btComponent],
        variables: {},
        txLedOn: false,
        builtInLedOn: false,
        sendMessage: "", // message arduino is sending
        delay: 0, // Number of milliseconds to delay
        powerLedOn: true,
        frameNumber: 1,
      };

      expect(eventToFrameFactory(event).frames).toEqual([state]);
    });
  });

  describe("bluetooth_send_message", () => {
    beforeEach(() => {
      [ws, arduinoBlock] = createArduinoAndWorkSpace();
    });

    it("sends the wired message every loop iteration", () => {
      bluetoothSetupBlock = setupBluetoothBlock(ws);
      bluetoothSetupBlock.setFieldValue("TRUE", "receiving_message");
      bluetoothSetupBlock.setFieldValue("hello world", "message");
      arduinoBlock.setFieldValue("2", "LOOP_TIMES");

      saveSensorSetupBlockData(createTestEvent(bluetoothSetupBlock.id)).forEach(
        updater,
      );

      const [sendMessageBlock] = stack(
        ws,
        [
          {
            type: "bluetooth_send_message",
            values: { MESSAGE: { str: "HELLO WORLD" } },
          },
        ],
        arduinoBlock,
      );

      // Event fired from the setup block still walks the whole loop stack.
      const [, state2, state3] =
        eventToFrameFactory(createTestEvent(bluetoothSetupBlock.id)).frames;

      expect(state2.explanation).toBe(
        'Sending "HELLO WORLD" from bluetooth to computer.',
      );
      expect(state2.blockId).toBe(sendMessageBlock.id);
      expect(state2.components.length).toBe(1);
      const btComponentS2 = state2.components.find(
        (c) => c.type === ArduinoComponentType.BLUE_TOOTH,
      ) as BluetoothState;
      expect(btComponentS2.sendMessage).toBe("HELLO WORLD");

      expect(state3.blockId).toBe(sendMessageBlock.id);
      expect(state3.components.length).toBe(1);
      const btComponentS3 = state3.components.find(
        (c) => c.type === ArduinoComponentType.BLUE_TOOTH,
      ) as BluetoothState;
      expect(btComponentS3.sendMessage).toBe("HELLO WORLD");

      // Removing the message input degrades to an empty-string send.
      sendMessageBlock
        .getInput("MESSAGE")!
        .connection!.targetBlock()!
        .dispose(true);

      const [, state2e2] =
        eventToFrameFactory(createTestEvent(bluetoothSetupBlock.id)).frames;

      expect(state2e2.explanation).toBe('Sending "" from bluetooth to computer.');
      expect(state2e2.blockId).toBe(sendMessageBlock.id);
    });

    // Added coverage: the transformer must no-op without a previous BT state
    // (send-message dragged in with no bluetooth_setup on the canvas).
    it("produces no frames when no bluetooth_setup exists", () => {
      const [orphanSend] = stack(
        ws,
        [
          {
            type: "bluetooth_send_message",
            values: { MESSAGE: { str: "anyone there?" } },
          },
        ],
        arduinoBlock,
      );
      expect(framesFor(orphanSend)).toHaveLength(0);
    });
  });
});
