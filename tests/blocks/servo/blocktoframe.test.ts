/**
 * Servo blocks — rotation state accumulation across pins.
 * Rewritten from the bespoke blocktoframe test; every assertion kept.
 */
import type { Workspace } from "blockly";
import { describe, it, beforeEach, afterEach, expect } from "vitest";

import "@/core/blockly/blocks";
import { createArduinoAndWorkSpace } from "../../app/tests.helper";
import type { BlockSvg } from "blockly";
import { ARDUINO_PINS } from "@/core/microcontroller/selectBoard";
import {
  ArduinoComponentType,
  ArduinoFrame,
} from "@/core/frames/arduino.frame";
import { findComponent } from "@/core/frames/transformer/frame-transformer.helpers";
import type { ServoState } from "@/blocks/servo/state";
import {
  stack,
  framesFor,
  expectFrame,
} from "../_harness/block.harness";

describe("servo blocks", () => {
  let ws: Workspace;
  let arduinoBlock: BlockSvg;

  beforeEach(() => {
    [ws, arduinoBlock] = createArduinoAndWorkSpace();
  });
  afterEach(() => {
    ws.dispose();
  });

  it("rotates servos on different pins and keeps per-pin degrees", () => {
    const [firstServo] = stack(
      ws,
      [
        { type: "rotate_servo", fields: { PIN: ARDUINO_PINS.PIN_6 }, values: { DEGREE: { num: 20 } } },
        { type: "rotate_servo", fields: { PIN: ARDUINO_PINS.PIN_9 }, values: { DEGREE: { num: 29 } } },
        { type: "rotate_servo", fields: { PIN: ARDUINO_PINS.PIN_6 }, values: { DEGREE: { num: 120 } } },
        { type: "rotate_servo", fields: { PIN: ARDUINO_PINS.PIN_9 }, values: { DEGREE: { num: 140 } } },
      ],
      arduinoBlock,
    );

    const [state1, state2, state3, state4] = framesFor(firstServo);

    expect(state1.explanation).toBe("Servo 6 is rotating to 20 degrees.");
    expect(state2.explanation).toBe("Servo 9 is rotating to 29 degrees.");
    expect(state3.explanation).toBe("Servo 6 is rotating to 120 degrees.");
    expect(state4.explanation).toBe("Servo 9 is rotating to 140 degrees.");

    expectFrame(state1, {
      count: 1,
      components: [{ type: ArduinoComponentType.SERVO, fields: { degree: 20 } }],
    });

    const verifyServos = (
      frame: ArduinoFrame,
      servo6Degree: number,
      servo9Degree: number,
    ) => {
      const servo6 = findComponent<ServoState>(
        frame,
        ArduinoComponentType.SERVO,
        ARDUINO_PINS.PIN_6,
      )!;
      const servo9 = findComponent<ServoState>(
        frame,
        ArduinoComponentType.SERVO,
        ARDUINO_PINS.PIN_9,
      )!;
      expect(servo6.degree).toBe(servo6Degree);
      expect(servo9.degree).toBe(servo9Degree);
      expect(frame.components.length).toBe(2);
    };

    verifyServos(state2, 20, 29);
    verifyServos(state3, 120, 29);
    verifyServos(state4, 120, 140);
  });
});
