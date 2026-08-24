/**
 * Stepper motor blocks — setup + move with rotation accumulation.
 * Rewritten from the bespoke frame test; every assertion kept.
 */
import type { Workspace } from "blockly";
import { describe, it, beforeEach, afterEach } from "vitest";

import "@/core/blockly/blocks";
import { ArduinoComponentType } from "@/core/frames/arduino.frame";
import { ARDUINO_PINS } from "@/core/microcontroller/selectBoard";
import { createArduinoAndWorkSpace } from "../../app/tests.helper";
import {
  stack,
  framesFor,
  expectFrame,
} from "../_harness/block.harness";

describe("stepper motor blocks", () => {
  let ws: Workspace;
  let arduinoBlock: import("blockly").BlockSvg;

  beforeEach(() => {
    [ws, arduinoBlock] = createArduinoAndWorkSpace();
  });
  afterEach(() => {
    ws.dispose();
  });

  const expectStepper = (
    frame: Parameters<typeof expectFrame>[0],
    exp: { steps: number; totalSteps: number; currentRotation: number },
    explanation?: string,
  ) =>
    expectFrame(frame, {
      count: 1,
      components: [
        {
          type: ArduinoComponentType.STEPPER_MOTOR,
          fields: {
            pin1: ARDUINO_PINS.PIN_4,
            pin2: ARDUINO_PINS.PIN_5,
            pin3: ARDUINO_PINS.PIN_6,
            pin4: ARDUINO_PINS.PIN_7,
            steps: exp.steps,
            totalSteps: exp.totalSteps,
            currentRotation: exp.currentRotation,
          },
        },
      ],
      ...(explanation !== undefined ? { explanation } : {}),
    });

  it("sets up and moves the stepper motor, accumulating rotation", () => {
    // stepper_motor_setup is pre-setup: in the workspace, never stacked.
    const setupBlock = ws.newBlock("stepper_motor_setup");
    setupBlock.setFieldValue(ARDUINO_PINS.PIN_4, "PIN_1");
    setupBlock.setFieldValue(ARDUINO_PINS.PIN_5, "PIN_2");
    setupBlock.setFieldValue(ARDUINO_PINS.PIN_6, "PIN_3");
    setupBlock.setFieldValue(ARDUINO_PINS.PIN_7, "PIN_4");
    setupBlock.setFieldValue("300", "TOTAL_STEPS");

    const [move1] = stack(
      ws,
      [
        { type: "stepper_motor_move", values: { STEPS: { num: 20 } } },
        { type: "stepper_motor_move", values: { STEPS: { num: -30 } } },
      ],
      arduinoBlock,
    );

    const [frame1, frame2, frame3] = framesFor(move1);

    expectStepper(
      frame1,
      { steps: 0, totalSteps: 300, currentRotation: 0 },
      "Setting up the stepper motor.",
    );
    expectStepper(
      frame2,
      { steps: 20, totalSteps: 300, currentRotation: 20 },
      "Stepper motor moving 20 steps.",
    );
    expectStepper(
      frame3,
      { steps: -30, totalSteps: 300, currentRotation: -10 },
      "Stepper motor moving -30 steps.",
    );
  });
});
