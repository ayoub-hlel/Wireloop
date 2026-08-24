/**
 * Digital sensor blocks — setup frames + read-value wiring.
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
import { DigitalPictureType, DigitalSensorState } from "@/blocks/digitalsensor/state";

describe("digital sensor blocks", () => {
  let ws: Workspace;

  beforeEach(() => {
    [ws] = createArduinoAndWorkSpace();
  });
  afterEach(() => {
    ws.dispose();
  });

  it("sets up sensors with different picture types", () => {
    const setupPin5 = ws.newBlock("digital_read_setup") as BlockSvg;
    setupPin5.setFieldValue("5", "PIN");
    setupPin5.setFieldValue("SENSOR", "TYPE");
    const eventPin5 = createTestEvent(setupPin5.id);

    const setupPin9 = ws.newBlock("digital_read_setup") as BlockSvg;
    setupPin9.setFieldValue("9", "PIN");
    setupPin9.setFieldValue("TOUCH_SENSOR", "TYPE");
    const eventPin9 = createTestEvent(setupPin9.id);

    saveSensorSetupBlockData(eventPin5).forEach(updater);
    saveSensorSetupBlockData(eventPin9).forEach(updater);

    const [frame1, frame2] = eventToFrameFactory(
      createTestEvent(setupPin9.id),
    ).frames;

    expect(frame1.explanation).toBe("Setting up digital sensor 5.");
    expect(frame2.explanation).toBe("Setting up touch sensor 9.");

    expect(frame1.components.length).toBe(1);
    const frame1sensor = frame1.components.find((c) =>
      c.pins.includes(ARDUINO_PINS.PIN_5),
    ) as DigitalSensorState;
    expect(frame1sensor.pictureType).toBe(DigitalPictureType.SENSOR);

    expect(frame2.components.length).toBe(2);
    const frame2sensor5 = frame2.components.find((c) =>
      c.pins.includes(ARDUINO_PINS.PIN_5),
    ) as DigitalSensorState;
    const frame2sensor9 = frame2.components.find((c) =>
      c.pins.includes(ARDUINO_PINS.PIN_9),
    ) as DigitalSensorState;

    expect(frame2sensor9.pictureType).toBe(DigitalPictureType.TOUCH_SENSOR);
    expect(frame2sensor5.pictureType).toBe(DigitalPictureType.SENSOR);
  });

  it("digital_read follows the sensor data across loops", () => {
    const readSetup = ws.newBlock("digital_read_setup") as BlockSvg;
    readSetup.setFieldValue("5", "PIN");

    const digitalReadBlock = ws.newBlock("digital_read");

    saveSensorSetupBlockData(createTestEvent(readSetup.id)).forEach(updater);

    readSetup.setFieldValue("2", "LOOP");
    readSetup.setFieldValue("FALSE", "isOn");
    saveSensorSetupBlockData(createTestEvent(readSetup.id)).forEach(updater);

    const setVariableBlock = createSetVariableBlockWithValue(
      ws,
      "isOn",
      VariableTypes.BOOLEAN,
      true,
    );
    setVariableBlock.getInput("VALUE")!.connection!.disconnect();
    setVariableBlock
      .getInput("VALUE")!
      .connection!.connect(digitalReadBlock.outputConnection!);

    connectToArduinoBlock(setVariableBlock);

    const [, frame1, frame2, frame3] = eventToFrameFactory(
      createTestEvent(readSetup.id),
    ).frames;

    expect(frame1.variables["isOn"].value).toBeTruthy();
    expect(frame2.variables["isOn"].value).toBeFalsy();
    expect(frame3.variables["isOn"].value).toBeTruthy();
  });
});
