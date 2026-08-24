/**
 * Arduino message block regression — rewritten on the shared harness.
 * The setup-block test asserts the FULL frame shape via toEqual.
 */
import { describe, it, beforeEach, afterEach, expect } from "vitest";
import type { Workspace, BlockSvg } from "blockly";

import "@/core/blockly/blocks";
import { eventToFrameFactory } from "@/core/frames/event-to-frame.factory";
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
import type { ArduinoReceiveMessageState } from "@/blocks/message/state";
import {
  stack,
} from "../_harness/block.harness";

describe("arduino message state factories", () => {
  let workspace: Workspace;
  let arduinoBlock: BlockSvg;
  let messageSetup: BlockSvg;

  afterEach(() => {
    workspace.dispose();
  });

  beforeEach(() => {
    [workspace, arduinoBlock] = createArduinoAndWorkSpace();
    arduinoBlock.setFieldValue("1", "LOOP_TIMES");
    messageSetup = workspace.newBlock("message_setup") as BlockSvg;

    messageSetup.setFieldValue("TRUE", "receiving_message");
    messageSetup.setFieldValue("hello world", "message");

    const event = createTestEvent(messageSetup.id);
    saveSensorSetupBlockData(event).forEach(updater);
  });

  it("sending a message emits a tx frame with the message attached", () => {
    const [sendMessageBlock] = stack(
      workspace,
      [
        {
          type: "arduino_send_message",
          values: { MESSAGE: { str: "Hello World!" } },
        },
      ],
      arduinoBlock,
    );

    // Event fires from the setup block but walks every block in the workspace,
    // so frame 2 is the send-message frame.
    const [, state2] = eventToFrameFactory(
      createTestEvent(messageSetup.id)
    ).frames;

    expect(state2.blockId).toBe(sendMessageBlock.id);
    expect(state2.explanation).toBe('Arduino sending message: "Hello World!".');
    expect(state2.sendMessage).toBe("Hello World!");
    expect(state2.txLedOn).toBeTruthy();
    expect(state2.builtInLedOn).toBeFalsy();
  });

  it("message_setup generates the full setup frame", () => {
    const event = createTestEvent(messageSetup.id);

    const message: ArduinoReceiveMessageState = {
      pins: [],
      hasMessage: true,
      message: "hello world",
      type: ArduinoComponentType.MESSAGE,
    };

    const state: ArduinoFrame = {
      blockId: messageSetup.id,
      blockName: "message_setup",
      timeLine: { function: "pre-setup", iteration: 0 },
      explanation: "Setting up Arduino messages.",
      components: [message],
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
