/**
 * Motor shield blocks — setup, move, stop.
 * Rewritten from the bespoke blocktoframe test; every assertion kept.
 */
import type { BlockSvg, Workspace } from "blockly";
import { describe, it, beforeEach, afterEach, expect } from "vitest";

import "@/core/blockly/blocks";
import { ArduinoComponentType, ArduinoFrame } from "@/core/frames/arduino.frame";
import { createArduinoAndWorkSpace } from "../../app/tests.helper";
import {
  stack,
  framesFor,
  expectFrame,
  type StepDef,
} from "../_harness/block.harness";
import type { MotorShieldState } from "@/blocks/motors/state";

describe("motor shield blocks", () => {
  let ws: Workspace;
  let arduinoBlock: BlockSvg;

  beforeEach(() => {
    [ws, arduinoBlock] = createArduinoAndWorkSpace();
  });
  afterEach(() => {
    ws.dispose();
  });

  const moveMotor = (
    motor: number,
    direction: string,
    speed: number,
  ): StepDef => ({
    type: "move_motor",
    fields: { DIRECTION: direction, MOTOR: motor },
    values: { SPEED: { num: speed } },
  });

  /** motor_setup is a pre-setup block: in the workspace but never stacked. */
  const createMotorSetup = (numberOfMotors: number) => {
    const block = ws.newBlock("motor_setup");
    block.setFieldValue(String(numberOfMotors), "NUMBER_OF_COMPONENTS");
    return block;
  };

  const verifyShield = (
    frame: ArduinoFrame,
    s1: number,
    s2: number,
    d1: string,
    d2: string,
  ) => {
    const shield = frame.components.find(
      (c) => c.type === ArduinoComponentType.MOTOR,
    ) as MotorShieldState;
    expect(shield.direction1).toBe(d1);
    expect(shield.direction2).toBe(d2);
    expect(shield.speed1).toBe(s1);
    expect(shield.speed2).toBe(s2);
    expect(frame.components.length).toBe(1);
  };

  it("stop_motor zeroes only its own motor", () => {
    createMotorSetup(2);

    const [, , , stop1] = stack(
      ws,
      [
        moveMotor(1, "CLOCKWISE", 50),
        moveMotor(2, "ANTI_CLOCKWISE", 150),
        { type: "stop_motor", fields: { MOTOR: "1" } },
        { type: "stop_motor", fields: { MOTOR: "2" } },
      ],
      arduinoBlock,
    );

    const [, , , stop1Frame, stop2Frame] = framesFor(stop1);

    expect(stop1Frame.explanation).toBe("Stopping motor 1.");
    verifyShield(
      stop1Frame,
      0,
      150,
      "CLOCKWISE",
      "ANTI_CLOCKWISE",
    );
    expect(stop2Frame.explanation).toBe("Stopping motor 2.");
    verifyShield(stop2Frame, 0, 0, "CLOCKWISE", "ANTI_CLOCKWISE");
  });

  it("two motors move independently in both directions", () => {
    createMotorSetup(2);

    const [, secondMove] = stack(
      ws,
      [
        moveMotor(1, "CLOCKWISE", 50),
        moveMotor(2, "ANTI_CLOCKWISE", 150),
        moveMotor(1, "ANTI_CLOCKWISE", 32),
        moveMotor(2, "CLOCKWISE", 43),
      ],
      arduinoBlock,
    );

    const [, state1, state2, state3, state4] = framesFor(secondMove);

    expect(state1.explanation).toBe("Motor 1 moves clockwise at speed 50.");
    expect(state2.explanation).toBe("Motor 2 moves anticlockwise at speed 150.");
    expect(state3.explanation).toBe("Motor 1 moves anticlockwise at speed 32.");
    expect(state4.explanation).toBe("Motor 2 moves clockwise at speed 43.");

    const shield1 = state1.components.find(
      (c) => c.type === ArduinoComponentType.MOTOR,
    ) as MotorShieldState;
    expect(shield1.direction1).toBe("CLOCKWISE");
    expect(shield1.speed1).toBe(50);

    verifyShield(state2, 50, 150, "CLOCKWISE", "ANTI_CLOCKWISE");
    verifyShield(state3, 32, 150, "ANTI_CLOCKWISE", "ANTI_CLOCKWISE");
    verifyShield(state4, 32, 43, "ANTI_CLOCKWISE", "CLOCKWISE");

    // keep the harness import contract explicit for the setup frame
    expectFrame(state3, { count: 1 });
  });
});
