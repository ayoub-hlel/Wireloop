/**
 * writepin blocks (digital_write / analog_write).
 * Rewritten from the bespoke blocktoframe test; every assertion kept, plus a
 * default-value case for analog_write.
 */
import type { Workspace } from "blockly";
import { describe, it, beforeEach, afterEach } from "vitest";

import "@/core/blockly/blocks";
import { ArduinoComponentType } from "@/core/frames/arduino.frame";
import { createArduinoAndWorkSpace } from "../../app/tests.helper";
import {
  stack,
  framesFor,
  expectFrame,
} from "../_harness/block.harness";
import { WritePinType } from "@/blocks/writepin/state";

describe("writepin blocks", () => {
  let ws: Workspace;
  let arduinoBlock: import("blockly").BlockSvg;

  beforeEach(() => {
    [ws, arduinoBlock] = createArduinoAndWorkSpace();
  });
  afterEach(() => {
    ws.dispose();
  });

  it("digital_write on the same pin replaces the previous state", () => {
    const [, second] = stack(
      ws,
      [
        { type: "digital_write", fields: { PIN: "3", STATE: "ON" } },
        { type: "digital_write", fields: { PIN: "3", STATE: "OFF" } },
      ],
      arduinoBlock,
    );
    const [frame1, frame2] = framesFor(second);

    expectFrame(frame1, {
      count: 1,
      components: [
        {
          type: ArduinoComponentType.WRITE_PIN,
          pins: ["3"],
          state: 1,
          fields: { pinType: WritePinType.DIGITAL_OUTPUT },
        },
      ],
      explanation: "Turning pin 3 on.",
    });
    expectFrame(frame2, {
      count: 1,
      components: [
        {
          type: ArduinoComponentType.WRITE_PIN,
          pins: ["3"],
          state: 0,
          fields: { pinType: WritePinType.DIGITAL_OUTPUT },
        },
      ],
      explanation: "Turning pin 3 off.",
    });
  });

  it("digital_write on different pins coexists with its own state", () => {
    const [, second] = stack(
      ws,
      [
        { type: "digital_write", fields: { PIN: "3", STATE: "ON" } },
        { type: "digital_write", fields: { PIN: "5", STATE: "OFF" } },
      ],
      arduinoBlock,
    );
    const [frame1, frame2] = framesFor(second);

    expectFrame(frame1, {
      count: 1,
      components: [{ pins: ["3"], state: 1 }],
      explanation: "Turning pin 3 on.",
    });
    expectFrame(frame2, {
      count: 2,
      components: [
        {
          pins: ["3"],
          fields: { pin: "3", state: 1, pinType: WritePinType.DIGITAL_OUTPUT },
        },
        {
          pins: ["5"],
          fields: { pin: "5", state: 0, pinType: WritePinType.DIGITAL_OUTPUT },
        },
      ],
      explanation: "Turning pin 5 off.",
    });
  });

  it("analog_write sends an input value to the pin", () => {
    const [write] = stack(
      ws,
      [
        {
          type: "analog_write",
          fields: { PIN: "9" },
          values: { WRITE_VALUE: { num: 30 } },
        },
      ],
      arduinoBlock,
    );
    const [frame1] = framesFor(write);

    expectFrame(frame1, {
      count: 1,
      components: [
        {
          type: ArduinoComponentType.WRITE_PIN,
          pins: ["9"],
          state: 30,
          fields: { pinType: WritePinType.ANALOG_OUTPUT, pin: "9" },
        },
      ],
      explanation: "Sending 30 to pin 9.",
    });
  });

  it("analog_write defaults to 1 when no value is wired", () => {
    const [write] = stack(
      ws,
      [{ type: "analog_write", fields: { PIN: "6" } }],
      arduinoBlock,
    );
    const [frame1] = framesFor(write);

    expectFrame(frame1, {
      count: 1,
      components: [{ state: 1, pins: ["6"] }],
      explanation: "Sending 1 to pin 6.",
    });
  });
});
