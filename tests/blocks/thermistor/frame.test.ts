/**
 * Thermistor blocks — setup frames + temperature reads across loops.
 * Rewritten from the bespoke frame test; every assertion kept.
 */
import type { BlockSvg, Workspace } from "blockly";
import { describe, it, beforeEach, afterEach, expect } from "vitest";

import "@/core/blockly/blocks";
import { connectToArduinoBlock } from "@/core/blockly/helpers/block.helper";
import { saveSensorSetupBlockData } from "@/core/blockly/actions/saveSensorSetupBlockData";
import { updater } from "@/core/blockly/updater";
import { VariableTypes } from "@/core/blockly/dto/variable.type";
import {
  ArduinoComponentType,
  ArduinoFrame,
} from "@/core/frames/arduino.frame";
import {
  createArduinoAndWorkSpace,
  createSetVariableBlockWithValue,
  createTestEvent,
} from "../../app/tests.helper";
import { eventToFrameFactory } from "@/core/frames/event-to-frame.factory";
import { ThermistorState } from "@/blocks/thermistor/state";

describe("thermistor blocks", () => {
  let ws: Workspace;
  let thermistorSetupBlock: BlockSvg;

  beforeEach(() => {
    [ws] = createArduinoAndWorkSpace();
    thermistorSetupBlock = ws.newBlock("thermistor_setup") as BlockSvg;
    thermistorSetupBlock.setFieldValue("A4", "PIN");
  });
  afterEach(() => {
    ws.dispose();
  });

  const saveLoopData = (temp: number, block: BlockSvg, loop: number) => {
    block.setFieldValue(loop.toString(), "LOOP");
    block.setFieldValue(temp.toString(), "TEMP");
    saveSensorSetupBlockData(createTestEvent(block.id)).forEach(updater);
  };

  const verifyState = (state: ArduinoFrame, temp: number) => {
    expect(state.components.length).toBe(1);
    const [component] = state.components as ThermistorState[];
    expect(component.type).toBe(ArduinoComponentType.THERMISTOR);
    expect(component.pins).toEqual(["A4"]);
    expect(component.temp).toBe(temp);
  };

  it("generates the setup state and tracks temperatures across loops", () => {
    saveLoopData(10, thermistorSetupBlock, 1);
    saveLoopData(104, thermistorSetupBlock, 2);
    saveLoopData(204, thermistorSetupBlock, 3);

    const sensorBlock = ws.newBlock("thermistor_read");

    const setVarNumBlock = createSetVariableBlockWithValue(
      ws,
      "temp",
      VariableTypes.NUMBER,
      0,
    );
    setVarNumBlock.getInput("VALUE")!.connection!.targetBlock()!.dispose(true);
    setVarNumBlock
      .getInput("VALUE")!
      .connection!.connect(sensorBlock.outputConnection!);

    connectToArduinoBlock(setVarNumBlock);

    const [state1, state2, state3, state4] = eventToFrameFactory(
      createTestEvent(setVarNumBlock.id),
    ).frames;

    expect(state1.explanation).toBe("Setting up Thermistor");
    verifyState(state1, 10); // setup block
    verifyState(state2, 10); // first loop
    verifyState(state3, 104); // second loop
    verifyState(state4, 204); // third loop
  });
});
