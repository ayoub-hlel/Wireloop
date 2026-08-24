/**
 * Analog sensor blocks — setup frames + read-value wiring.
 * Merged former blocktoframe/blocktovalue bespoke tests; every assertion kept.
 */
import type { BlockSvg, Workspace } from "blockly";
import { describe, it, beforeEach, afterEach, expect } from "vitest";

import { saveSensorSetupBlockData } from "@/core/blockly/actions/saveSensorSetupBlockData";
import "@/core/blockly/blocks";
import { updater } from "@/core/blockly/updater";
import { VariableTypes } from "@/core/blockly/dto/variable.type";
import { connectToArduinoBlock } from "@/core/blockly/helpers/block.helper";
import { eventToFrameFactory } from "@/core/frames/event-to-frame.factory";
import { ARDUINO_PINS } from "@/core/microcontroller/selectBoard";
import {
  createArduinoAndWorkSpace,
  createSetVariableBlockWithValue,
  createTestEvent,
} from "../../app/tests.helper";
import {
  AnalogSensorPicture,
  AnalogSensorState,
} from "@/blocks/analogsensor/state";

describe("analog sensor blocks", () => {
  let ws: Workspace;

  beforeEach(() => {
    [ws] = createArduinoAndWorkSpace();
  });
  afterEach(() => {
    ws.dispose();
  });

  it("sets up sensors with different picture types", () => {
    const setupA1 = ws.newBlock("analog_read_setup") as BlockSvg;
    setupA1.setFieldValue("A1", "PIN");
    setupA1.setFieldValue("SENSOR", "TYPE");
    const eventA1 = createTestEvent(setupA1.id);

    const setupA2 = ws.newBlock("analog_read_setup") as BlockSvg;
    setupA2.setFieldValue("A2", "PIN");
    setupA2.setFieldValue("PHOTO_SENSOR", "TYPE");
    const eventA2 = createTestEvent(setupA2.id);

    saveSensorSetupBlockData(eventA1).forEach(updater);
    saveSensorSetupBlockData(eventA2).forEach(updater);

    const [frame1, frame2] = eventToFrameFactory(
      createTestEvent(setupA2.id),
    ).frames;

    expect(frame1.explanation).toBe("Setting up analog sensor A1.");
    expect(frame2.explanation).toBe("Setting up photo sensor A2.");

    expect(frame1.components.length).toBe(1);
    const frame1sensor = frame1.components.find((c) =>
      c.pins.includes(ARDUINO_PINS.PIN_A1),
    ) as AnalogSensorState;
    expect(frame1sensor.pictureType).toBe(AnalogSensorPicture.SENSOR);

    expect(frame2.components.length).toBe(2);
    const frame2sensorA1 = frame2.components.find((c) =>
      c.pins.includes(ARDUINO_PINS.PIN_A1),
    ) as AnalogSensorState;
    const frame2sensorA2 = frame2.components.find((c) =>
      c.pins.includes(ARDUINO_PINS.PIN_A2),
    ) as AnalogSensorState;

    expect(frame2sensorA2.pictureType).toBe(AnalogSensorPicture.PHOTO_SENSOR);
    expect(frame2sensorA1.pictureType).toBe(AnalogSensorPicture.SENSOR);
  });

  it("analog_read follows the sensor data across loops", () => {
    const readSetup = ws.newBlock("analog_read_setup") as BlockSvg;
    readSetup.setFieldValue("1", "state");
    readSetup.setFieldValue("A3", "PIN");

    const analogReadBlock = ws.newBlock("analog_read");
    analogReadBlock.setFieldValue("A3", "PIN");

    saveSensorSetupBlockData(createTestEvent(readSetup.id)).forEach(updater);

    readSetup.setFieldValue("2", "LOOP");
    readSetup.setFieldValue("30", "state");
    saveSensorSetupBlockData(createTestEvent(readSetup.id)).forEach(updater);

    const setVariableBlock = createSetVariableBlockWithValue(
      ws,
      "state",
      VariableTypes.NUMBER,
      true,
    );
    setVariableBlock.getInput("VALUE")!.connection!.disconnect();
    setVariableBlock
      .getInput("VALUE")!
      .connection!.connect(analogReadBlock.outputConnection!);

    connectToArduinoBlock(setVariableBlock);

    const [, frame1, frame2, frame3] = eventToFrameFactory(
      createTestEvent(readSetup.id),
    ).frames;

    expect(frame1.variables["state"].value).toBe(1);
    expect(frame2.variables["state"].value).toBe(30);
    expect(frame3.variables["state"].value).toBe(1);
  });
});
