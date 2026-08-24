/**
 * Ultrasonic sensor regression — rewritten for the table-driven suite.
 * Merged from blocktoframe.test.ts + blocktovalue.test.ts; every original
 * assertion is preserved. Sensor setup blocks need the
 * saveSensorSetupBlockData -> updater ritual, so wiring stays hand-rolled;
 * assertions reuse the shared harness where it fits.
 */
import { describe, it, beforeEach, afterEach, expect } from "vitest";
import "@/core/blockly/blocks";
import type { Workspace, BlockSvg } from "blockly";

import { saveSensorSetupBlockData } from "@/core/blockly/actions/saveSensorSetupBlockData";
import { updater } from "@/core/blockly/updater";
import { connectToArduinoBlock } from "@/core/blockly/helpers/block.helper";
import {
  createArduinoAndWorkSpace,
  createSetVariableBlockWithValue,
  createTestEvent,
} from "../../app/tests.helper";
import { eventToFrameFactory } from "@/core/frames/event-to-frame.factory";
import { ArduinoComponentType, type ArduinoFrame } from "@/core/frames/arduino.frame";
import { ARDUINO_PINS } from "@/core/microcontroller/selectBoard";
import type { UltraSonicSensorState } from "@/blocks/ultrasonic_sensor/state";
import { VariableTypes } from "@/core/blockly/dto/variable.type";

describe("ultra sonic sensor blocks", () => {
  let workspace: Workspace;
  let ultraSonicSensor: BlockSvg;

  beforeEach(() => {
    [workspace] = createArduinoAndWorkSpace();
    ultraSonicSensor = workspace.newBlock(
      "ultra_sonic_sensor_setup"
    ) as BlockSvg;
    ultraSonicSensor.setFieldValue("11", "PIN_TRIG");
    ultraSonicSensor.setFieldValue("12", "PIN_ECHO");
    ultraSonicSensor.setFieldValue("10", "cm");

    // Sensor states are read from persisted setup data, not raw fields.
    const event = createTestEvent(ultraSonicSensor.id);
    saveSensorSetupBlockData(event).forEach(updater);
  });
  afterEach(() => {
    workspace.dispose();
  });

  const saveLoopData = (distance: number, block: BlockSvg, loop: number) => {
    block.setFieldValue(loop.toString(), "LOOP");
    block.setFieldValue(distance.toString(), "cm");

    const event = createTestEvent(block.id);

    saveSensorSetupBlockData(event).forEach(updater);
  };

  it("setup block produces the full initial sensor state frame", () => {
    const event = createTestEvent(ultraSonicSensor.id);

    // Full-frame lock (same deep equality as the original test).
    expect(eventToFrameFactory(event).frames).toEqual([
      {
        blockId: ultraSonicSensor.id,
        blockName: "ultra_sonic_sensor_setup",
        timeLine: { function: "pre-setup", iteration: 0 },
        explanation: "Setting up ultra sonic sensor.",
        components: [
          {
            pins: [ARDUINO_PINS.PIN_11, ARDUINO_PINS.PIN_12],
            echoPin: ARDUINO_PINS.PIN_12,
            trigPin: ARDUINO_PINS.PIN_11,
            cm: 10,
            type: ArduinoComponentType.ULTRASONICE_SENSOR,
          },
        ],
        variables: {},
        txLedOn: false,
        builtInLedOn: false,
        sendMessage: "",
        delay: 0,
        powerLedOn: true,
        frameNumber: 1,
      },
    ]);
  });

  it("motion block reads the recorded distance into a variable across loop iterations", () => {
    saveLoopData(10, ultraSonicSensor, 1);
    saveLoopData(104, ultraSonicSensor, 2);
    saveLoopData(204, ultraSonicSensor, 3);

    const sensorBlock = workspace.newBlock("ultra_sonic_sensor_motion");

    const setVarNumBlock = createSetVariableBlockWithValue(
      workspace,
      "distance",
      VariableTypes.NUMBER,
      0
    );
    setVarNumBlock.getInput("VALUE")!.connection!.targetBlock()!.dispose(true);

    setVarNumBlock
      .getInput("VALUE")!.connection!.connect(sensorBlock.outputConnection!);

    connectToArduinoBlock(setVarNumBlock);

    const event = createTestEvent(setVarNumBlock.id);

    const [, state1, state2, state3] = eventToFrameFactory(event).frames;

    [
      [state1, 10],
      [state2, 104],
      [state3, 204],
    ].forEach(([state, distance]) => {
      const frame = state as ArduinoFrame;
      const component = frame.components[0] as UltraSonicSensorState;
      expect(frame.variables["distance"].value).toBe(distance);
      expect(component.cm).toBe(distance);
    });
  });
});
