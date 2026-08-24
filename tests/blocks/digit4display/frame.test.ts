/**
 * Digital display (TM1637) block regression — data-driven specs (see _harness).
 * Every assertion from the original bespoke test is preserved.
 */
import { describe, it, beforeEach, afterEach } from "vitest";
import type { Workspace, BlockSvg } from "blockly";

import "@/core/blockly/blocks";
import {
  createArduinoAndWorkSpace,
  createTestEvent,
} from "../../app/tests.helper";
import { ARDUINO_PINS } from "@/core/microcontroller/selectBoard";
import { eventToFrameFactory } from "@/core/frames/event-to-frame.factory";
import { stack, expectFrame } from "../_harness/block.harness";

describe("digital_display blocks", () => {
  let ws: Workspace;
  let arduino: BlockSvg;
  let setupBlock: BlockSvg;

  beforeEach(() => {
    [ws, arduino] = createArduinoAndWorkSpace();
    arduino.setFieldValue("1", "LOOP_TIMES");
    setupBlock = ws.newBlock("digital_display_setup") as BlockSvg;
    setupBlock.setFieldValue(ARDUINO_PINS.PIN_11, "CLK_PIN");
    setupBlock.setFieldValue(ARDUINO_PINS.PIN_12, "DIO_PIN");
  });
  afterEach(() => ws.dispose());

  it("updates text and colon across frames after a single setup", () => {
    const _blocks = stack(
      ws,
      [
        {
          type: "digital_display_set",
          fields: { COLON: "FALSE" },
          values: { TEXT: { str: "1010" } },
        },
        {
          type: "digital_display_set",
          fields: { COLON: "TRUE" },
          values: { TEXT: { str: "NoAh" } },
        },
      ],
      arduino,
    );

    // Fire from the setup block so pre-setup + both set frames are produced.
    const frames = eventToFrameFactory(createTestEvent(setupBlock.id)).frames;

    expect(frames.length).toBe(3);
    expectFrame(frames[0], {
      count: 1,
      explanation: "Setting up digital display.",
      fields: {
        colonOn: false,
        chars: "",
        clkPin: ARDUINO_PINS.PIN_11,
        dioPin: ARDUINO_PINS.PIN_12,
      },
    });
    expectFrame(frames[1], {
      count: 1,
      explanation: 'Setting Digital Display text to "1010" and colon is off.',
      fields: {
        colonOn: false,
        chars: "1010",
        clkPin: ARDUINO_PINS.PIN_11,
        dioPin: ARDUINO_PINS.PIN_12,
      },
    });
    expectFrame(frames[2], {
      count: 1,
      explanation: 'Setting Digital Display text to "NoAh" and colon is on.',
      fields: {
        colonOn: true,
        chars: "NoAh",
        clkPin: ARDUINO_PINS.PIN_11,
        dioPin: ARDUINO_PINS.PIN_12,
      },
    });
  });

  it("setup pins default correctly when only the set block runs", () => {
    const [setOnly] = stack(
      ws,
      [
        {
          type: "digital_display_set",
          fields: { COLON: "TRUE" },
          values: { TEXT: { str: "8.8.8.8" } },
        },
      ],
      arduino,
    );

    const [setupFrame, setFrame] = eventToFrameFactory(
      createTestEvent(setOnly.id),
    ).frames;
    // The unconnected setup block still emits its pre-setup frame first.
    expectFrame(setupFrame, { explanation: "Setting up digital display." });
    // The TM1637 has 4 digit slots: longer strings are truncated.
    expectFrame(setFrame, {
      count: 1,
      explanation:
        'Setting Digital Display text to "8.8." and colon is on.',
      fields: { colonOn: true, chars: "8.8." },
    });
  });
});
