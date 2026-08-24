/**
 * Arduino message value blocks (get / receive) regression across loop
 * iterations. Setup ordering needs raw primitives; assertions preserved.
 */
import { describe, it, beforeEach, afterEach, expect } from "vitest";

import "@/core/blockly/blocks";
import type { Workspace, BlockSvg } from "blockly";
import { connectToArduinoBlock } from "@/core/blockly/helpers/block.helper";
import { eventToFrameFactory } from "@/core/frames/event-to-frame.factory";
import { saveSensorSetupBlockData } from "@/core/blockly/actions/saveSensorSetupBlockData";
import { updater } from "@/core/blockly/updater";
import {
  createArduinoAndWorkSpace,
  createSetVariableBlockWithValue,
  createTestEvent,
} from "../../app/tests.helper";
import { VariableTypes } from "@/core/blockly/dto/variable.type";

describe("arduino message state factories", () => {
  let workspace: Workspace;
  let messageSetup: BlockSvg;
  let arduinoBlock: BlockSvg;

  afterEach(() => {
    workspace.dispose();
  });

  beforeEach(() => {
    [workspace, arduinoBlock] = createArduinoAndWorkSpace();
    arduinoBlock.setFieldValue("3", "LOOP_TIMES");
    messageSetup = workspace.newBlock("message_setup") as BlockSvg;

    // Register the sensor data for each of the three loop iterations:
    // loops 1 and 2 receive messages, loop 3 stops receiving.
    messageSetup.setFieldValue("1", "LOOP");
    messageSetup.setFieldValue("TRUE", "receiving_message");
    messageSetup.setFieldValue("one", "message");
    saveSensorSetupBlockData(createTestEvent(messageSetup.id)).forEach(updater);

    messageSetup.setFieldValue("2", "LOOP");
    messageSetup.setFieldValue("TRUE", "receiving_message");
    messageSetup.setFieldValue("two", "message");
    saveSensorSetupBlockData(createTestEvent(messageSetup.id)).forEach(updater);

    messageSetup.setFieldValue("3", "LOOP");
    messageSetup.setFieldValue("FALSE", "receiving_message");
    saveSensorSetupBlockData(createTestEvent(messageSetup.id)).forEach(updater);
  });

  it("arduino_get_message returns the message of the current loop", () => {
    const textVariableBlock = createSetVariableBlockWithValue(
      workspace,
      "text",
      VariableTypes.STRING,
      "blue"
    );
    textVariableBlock.getInput("VALUE")!.connection!.targetBlock()!.dispose(true);

    const getMessageBlock = workspace.newBlock("arduino_get_message");
    textVariableBlock
      .getInput("VALUE")!.connection!.connect(getMessageBlock.outputConnection!);

    connectToArduinoBlock(textVariableBlock);
    const event = createTestEvent(messageSetup.id);

    const [, state2, state3, state4] = eventToFrameFactory(event).frames;
    expect(state2.variables["text"].value).toBe("one");
    expect(state3.variables["text"].value).toBe("two");
    expect(state4.variables["text"].value).toBe("");
  });

  it("arduino_receive_message reports whether a message is arriving per loop", () => {
    const boolVariableBlock = createSetVariableBlockWithValue(
      workspace,
      "has_message",
      VariableTypes.BOOLEAN,
      "blue"
    );
    boolVariableBlock.getInput("VALUE")!.connection!.targetBlock()!.dispose(true);

    const getMessageBlock = workspace.newBlock("arduino_receive_message");
    boolVariableBlock
      .getInput("VALUE")!.connection!.connect(getMessageBlock.outputConnection!);

    connectToArduinoBlock(boolVariableBlock);
    const event = createTestEvent(boolVariableBlock.id);

    const [, state2, state3, state4] = eventToFrameFactory(event).frames;
    expect(state2.variables["has_message"].value).toBeTruthy();
    expect(state3.variables["has_message"].value).toBeTruthy();
    expect(state4.variables["has_message"].value).toBeFalsy();
  });
});
