/**
 * LED block regression — rewritten as data-driven specs (see _harness).
 * Every assertion from the original bespoke tests is preserved.
 */
import { describe, it, beforeEach, afterEach } from "vitest";
import type { Workspace, BlockSvg } from "blockly";

import { createArduinoAndWorkSpace } from "../../app/tests.helper";
import { ArduinoComponentType } from "@/core/frames/arduino.frame";
import {
  stack,
  framesFor,
  expectFrame,
} from "../_harness/block.harness";

describe("led blocks", () => {
  let ws: Workspace;
  let arduino: BlockSvg;
  beforeEach(() => {
    [ws, arduino] = createArduinoAndWorkSpace();
  });
  afterEach(() => {
    ws.dispose();
  });

  it("two leds sharing a pin: the later block replaces the earlier one", () => {
    const [, led2] = stack(
      ws,
      [
        { type: "led", fields: { PIN: "3", STATE: "ON" } },
        { type: "led", fields: { PIN: "3", STATE: "OFF" } },
      ],
      arduino,
    );
    const [frame1, frame2] = framesFor(led2);

    expectFrame(frame1, {
      count: 1,
      components: [
        {
          type: ArduinoComponentType.LED,
          pins: ["3"],
          fields: { state: 1, fade: false },
        },
      ],
      explanation: "Turning on led 3.",
    });
    expectFrame(frame2, {
      count: 1,
      components: [{ pins: ["3"], fields: { state: 0 } }],
      explanation: "Turning off led 3.",
    });
  });

  it("leds on different pins coexist and keep their own states", () => {
    const [, led2] = stack(
      ws,
      [
        { type: "led", fields: { PIN: "3", STATE: "ON" } },
        { type: "led", fields: { PIN: "5", STATE: "OFF" } },
      ],
      arduino,
    );
    const [frame1, frame2] = framesFor(led2);

    expectFrame(frame1, {
      count: 1,
      components: [{ pins: ["3"], fields: { state: 1 } }],
    });
    expectFrame(frame2, {
      count: 2,
      components: [
        { pins: ["3"], fields: { pin: "3", state: 1, fade: false } },
        { pins: ["5"], fields: { pin: "5", state: 0, fade: false } },
      ],
      explanation: "Turning off led 5.",
    });
  });

  it("led_fade drives a pwm value from an input", () => {
    const [fade] = stack(
      ws,
      [
        {
          type: "led_fade",
          fields: { PIN: "9" },
          values: { FADE: { num: 30 } },
        },
      ],
      arduino,
    );
    const [frame1] = framesFor(fade);

    expectFrame(frame1, {
      count: 1,
      components: [
        {
          type: ArduinoComponentType.LED,
          pins: ["9"],
          fields: { fade: true, state: 30 },
        },
      ],
      explanation: "Fading Led 9 to 30.",
    });
  });
});
