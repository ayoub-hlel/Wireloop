/**
 * bluetooth_get_message / bluetooth_has_message regression — rewritten
 * against the shared harness. Every assertion from the original bespoke file
 * is preserved: three sensor-setup snapshots drive three loop iterations, and
 * both value blocks must resolve against the right snapshot each iteration.
 */
import { describe, it, afterEach, expect } from "vitest";
import type { Workspace, BlockSvg } from "blockly";
import _ from "lodash";

import "@/core/blockly/blocks";

import {
  createArduinoAndWorkSpace,
  createSetVariableBlockWithValue,
  createTestEvent,
} from "../../app/tests.helper";
import { VariableTypes } from "@/core/blockly/dto/variable.type";
import { connectToArduinoBlock } from "@/core/blockly/helpers/block.helper";
import { saveSensorSetupBlockData } from "@/core/blockly/actions/saveSensorSetupBlockData";
import { updater } from "@/core/blockly/updater";
import { ARDUINO_PINS } from "@/core/microcontroller/selectBoard";
import { ArduinoComponentType } from "@/core/frames/arduino.frame";
import { findComponent } from "@/core/frames/transformer/frame-transformer.helpers";
import { eventToFrameFactory } from "@/core/frames/event-to-frame.factory";
import type { BluetoothState } from "@/blocks/bluetooth/state";

describe("bluetooth value blocks (get_message / has_message)", () => {
  let ws: Workspace;
  let arduinoBlock: BlockSvg;

  afterEach(() => {
    ws.dispose();
  });

  it("resolves message state per sensor snapshot across loop iterations", () => {
    [ws, arduinoBlock] = createArduinoAndWorkSpace();
    const btSetupBlock = ws.newBlock("bluetooth_setup") as BlockSvg;
    btSetupBlock.setFieldValue(ARDUINO_PINS.PIN_7, "PIN_RX");
    btSetupBlock.setFieldValue(ARDUINO_PINS.PIN_6, "PIN_TX");

    // Three snapshots: LOOP 1 has a message, LOOP 2 none, LOOP 3 a new one.
    arduinoBlock.setFieldValue("3", "LOOP_TIMES");
    btSetupBlock.setFieldValue("TRUE", "receiving_message");
    btSetupBlock.setFieldValue("MESSAGE_1", "message");
    btSetupBlock.setFieldValue("1", "LOOP");
    saveSensorSetupBlockData(createTestEvent(btSetupBlock.id)).forEach(updater);

    btSetupBlock.setFieldValue("FALSE", "receiving_message");
    btSetupBlock.setFieldValue("", "message");
    btSetupBlock.setFieldValue("2", "LOOP");
    saveSensorSetupBlockData(createTestEvent(btSetupBlock.id)).forEach(updater);

    btSetupBlock.setFieldValue("TRUE", "receiving_message");
    btSetupBlock.setFieldValue("MESSAGE_3", "message");
    btSetupBlock.setFieldValue("3", "LOOP");
    saveSensorSetupBlockData(createTestEvent(btSetupBlock.id)).forEach(updater);

    // Wire: hasMessage = bluetooth_has_message, message = bluetooth_get_message
    const getBtMessageBlock = ws.newBlock("bluetooth_get_message");
    const hasBtMessageBlock = ws.newBlock("bluetooth_has_message");

    const setVariableTextBlock = createSetVariableBlockWithValue(
      ws,
      "message",
      VariableTypes.STRING,
      "",
    );
    const hasMessageBoolBlock = createSetVariableBlockWithValue(
      ws,
      "hasMessage",
      VariableTypes.BOOLEAN,
      true,
    );

    setVariableTextBlock
      .getInput("VALUE")!
      .connection!.targetBlock()!
      .dispose(true);
    hasMessageBoolBlock
      .getInput("VALUE")!
      .connection!.targetBlock()!
      .dispose(true);

    setVariableTextBlock
      .getInput("VALUE")!
      .connection!.connect(getBtMessageBlock.outputConnection!);
    hasMessageBoolBlock
      .getInput("VALUE")!
      .connection!.connect(hasBtMessageBlock.outputConnection!);

    connectToArduinoBlock(setVariableTextBlock);
    connectToArduinoBlock(hasMessageBoolBlock);

    const states = eventToFrameFactory(createTestEvent(btSetupBlock.id)).frames;

    expect(states.length).toBe(7);
    const [, state2, state3, state4, state5, state6, state7] = states;
    const btOf = (frame: (typeof states)[number]) =>
      findComponent<BluetoothState>(frame, ArduinoComponentType.BLUE_TOOTH)!;

    // LOOP 1: message arrives -> hasMessage true first, then message captured.
    expect(state2.variables["hasMessage"].value).toBe(true);
    expect(_.keys(state2.variables).length).toBe(1);
    expect(btOf(state2).hasMessage).toBeTruthy();
    expect(btOf(state2).message).toBe("MESSAGE_1");

    expect(state3.variables["hasMessage"].value).toBe(true);
    expect(state3.variables["message"].value).toBe("MESSAGE_1");
    expect(_.keys(state3.variables).length).toBe(2);
    expect(btOf(state3).hasMessage).toBeTruthy();
    expect(btOf(state3).message).toBe("MESSAGE_1");

    // LOOP 2: no message -> hasMessage false, stale message cleared next frame.
    expect(state4.variables["hasMessage"].value).toBe(false);
    expect(state4.variables["message"].value).toBe("MESSAGE_1");
    expect(_.keys(state4.variables).length).toBe(2);
    expect(btOf(state4).hasMessage).toBeFalsy();
    expect(btOf(state4).message).toBe("");

    expect(state5.variables["hasMessage"].value).toBe(false);
    expect(state5.variables["message"].value).toBe("");
    expect(_.keys(state5.variables).length).toBe(2);
    expect(btOf(state5).hasMessage).toBeFalsy();
    expect(btOf(state5).message).toBe("");

    // LOOP 3: new message arrives again.
    expect(state6.variables["hasMessage"].value).toBe(true);
    expect(state6.variables["message"].value).toBe("");
    expect(_.keys(state6.variables).length).toBe(2);
    expect(btOf(state6).hasMessage).toBeTruthy();
    expect(btOf(state6).message).toBe("MESSAGE_3");

    expect(state7.variables["hasMessage"].value).toBe(true);
    expect(state7.variables["message"].value).toBe("MESSAGE_3");
    expect(_.keys(state7.variables).length).toBe(2);
    expect(btOf(state7).hasMessage).toBeTruthy();
    expect(btOf(state7).message).toBe("MESSAGE_3");
  });
});
