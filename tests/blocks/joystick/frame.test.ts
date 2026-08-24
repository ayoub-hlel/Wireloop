/**
 * Joystick block regression — rewritten in harness style.
 * Every assertion from the original bespoke test is preserved; the sensor
 * setup flow (saveSensorSetupBlockData + updater) stays on raw primitives
 * because it simulates two iterations of setup-block data rather than a
 * plain block stack.
 */
import { describe, it, beforeEach, afterEach, expect } from "vitest";

import "@/core/blockly/blocks";
import type { Workspace } from "blockly";
import {
  createArduinoAndWorkSpace,
  createSetVariableBlockWithValue,
  createTestEvent,
} from "../../app/tests.helper";
import { ARDUINO_PINS } from "@/core/microcontroller/selectBoard";
import { updater } from "@/core/blockly/updater";
import { saveSensorSetupBlockData } from "@/core/blockly/actions/saveSensorSetupBlockData";
import { ArduinoComponentType } from "@/core/frames/arduino.frame";
import type { ArduinoFrame } from "@/core/frames/arduino.frame";
import { eventToFrameFactory } from "@/core/frames/event-to-frame.factory";
import type { JoystickState } from "@/blocks/joystick/state";
import { VariableTypes } from "@/core/blockly/dto/variable.type";
import { connectToArduinoBlock } from "@/core/blockly/helpers/block.helper";

describe("joystick blocks", () => {
  let workspace: Workspace;
  let arduinoSetupBlock;

  afterEach(() => {
    workspace.dispose();
  });

  /** Pins are identical across all joystick states under test. */
  const expectPins = (frame: ArduinoFrame) => {
    const state = frame.components[0] as JoystickState;
    expect(state.type).toBe(ArduinoComponentType.JOYSTICK);
    expect(state.xPin).toBe(ARDUINO_PINS.PIN_A2);
    expect(state.yPin).toBe(ARDUINO_PINS.PIN_A4);
    expect(state.buttonPin).toBe(ARDUINO_PINS.PIN_7);
  };

  beforeEach(() => {
    [workspace, arduinoSetupBlock] = createArduinoAndWorkSpace();
    arduinoSetupBlock.setFieldValue("2", "LOOP_TIMES");
    const joystickSetup = workspace.newBlock("joystick_setup");
    joystickSetup.setFieldValue(ARDUINO_PINS.PIN_A2, "PIN_X");
    joystickSetup.setFieldValue(ARDUINO_PINS.PIN_A4, "PIN_Y");
    joystickSetup.setFieldValue(ARDUINO_PINS.PIN_7, "PIN_BUTTON");
    joystickSetup.setFieldValue("1", "LOOP");
    joystickSetup.setFieldValue("FALSE", "ENGAGED");
    joystickSetup.setFieldValue("0", "DEGREE");
    joystickSetup.setFieldValue("FALSE", "BUTTON_PRESSED");

    saveSensorSetupBlockData(createTestEvent(joystickSetup.id)).forEach(
      updater
    );

    // Second save simulates the sensor data changing between loop
    // iterations — the frames must reflect the LATEST setup values.
    joystickSetup.setFieldValue("2", "LOOP");
    joystickSetup.setFieldValue("TRUE", "ENGAGED");
    joystickSetup.setFieldValue("90", "DEGREE");
    joystickSetup.setFieldValue("TRUE", "BUTTON_PRESSED");

    saveSensorSetupBlockData(createTestEvent(joystickSetup.id)).forEach(
      updater
    );
  });

  it("should have the sensor values during through each loop", () => {
    const degreeJoystickBlock = workspace.newBlock("joystick_angle");
    const degreeVarBlock = createSetVariableBlockWithValue(
      workspace,
      "degrees",
      VariableTypes.NUMBER,
      0
    );
    degreeVarBlock.getInput("VALUE")!.connection!.targetBlock()!.dispose(true);
    degreeVarBlock
      .getInput("VALUE")!.connection!.connect(degreeJoystickBlock.outputConnection!);

    connectToArduinoBlock(degreeVarBlock);

    const event = createTestEvent(degreeVarBlock.id);

    const frames = eventToFrameFactory(event).frames;
    expect(frames.length).toBe(3);

    const [frame1, frame2, frame3] = frames;
    expect(frame1.explanation).toBe("Setting up joystick.");
    expectPins(frame1);
    expect((frame1.components[0] as JoystickState).degree).toBe(0);
    expect((frame1.components[0] as JoystickState).buttonPressed).toBe(false);
    expect((frame1.components[0] as JoystickState).engaged).toBe(false);

    expectPins(frame2);
    expect((frame2.components[0] as JoystickState).degree).toBe(0);
    expect((frame2.components[0] as JoystickState).buttonPressed).toBe(false);
    expect((frame2.components[0] as JoystickState).engaged).toBe(false);

    expectPins(frame3);
    expect((frame3.components[0] as JoystickState).degree).toBe(90);
    expect((frame3.components[0] as JoystickState).buttonPressed).toBe(true);
    expect((frame3.components[0] as JoystickState).engaged).toBe(true);
  });

});
