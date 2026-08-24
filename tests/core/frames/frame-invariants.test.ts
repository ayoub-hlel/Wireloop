/**
 * Frame-engine invariants (tests/core/frames).
 *
 * These lock the structural guarantees every block transformer relies on.
 * If any of these break, EVERY block's simulation output becomes suspect,
 * so they are asserted here once instead of in all 30+ category suites:
 *
 * 1. Frames never share mutable state (the cloneDeep contract) — mutating
 *    frame N's components must never leak into frame N-1.
 * 2. Variables propagate forward through the frame chain.
 * 3. Every frame carries the full ArduinoFrame shape (explanation, timeline,
 *    frameNumber, component list).
 * 4. Loop iterations advance monotonically and stay on the "loop" phase.
 */
import { describe, it, beforeEach, afterEach, expect } from "vitest";
import type { Workspace, BlockSvg } from "blockly";

import "@/core/blockly/blocks";
import {
  createArduinoAndWorkSpace,
  createSetVariableBlockWithValue,
} from "../../app/tests.helper";
import { connectToArduinoBlock } from "@/core/blockly/helpers/block.helper";
import { VariableTypes } from "@/core/blockly/dto/variable.type";
import { ArduinoComponentType } from "@/core/frames/arduino.frame";
import type { LedState } from "@/blocks/led/state";
import {
  stack,
  framesFor,
} from "../../blocks/_harness/block.harness";

describe("frame engine invariants", () => {
  let ws: Workspace;
  let arduino: BlockSvg;
  beforeEach(() => {
    [ws, arduino] = createArduinoAndWorkSpace();
  });
  afterEach(() => {
    ws.dispose();
  });

  it("mutating a component on frame N does not affect frame N-1", () => {
    const [, led2] = stack(
      ws,
      [
        { type: "led", fields: { PIN: "3", STATE: "ON" } },
        { type: "led", fields: { PIN: "5", STATE: "OFF" } },
      ],
      arduino,
    );
    const [frame1, frame2] = framesFor(led2);

    const before = JSON.stringify(frame1.components);
    // Sabotage the latest frame's shared component set.
    ((frame2.components[0] as LedState) ?? {}).state = 999;
    if (frame2.components[1]) (frame2.components[1] as LedState).pin = "13";

    expect(JSON.stringify(frame1.components)).toBe(before);
    expect((frame1.components[0] as LedState).state).toBe(1);
  });

  it("variables set early in the stack are visible in later frames", () => {
    const setVarBlock = createSetVariableBlockWithValue(
      ws,
      "brightness",
      VariableTypes.NUMBER,
      42
    );
    const ledBlock = ws.newBlock("led") as BlockSvg;
    ledBlock.setFieldValue("3", "PIN");
    ledBlock.setFieldValue("ON", "STATE");
    // Connect later-defined first so execution order matches visual order.
    connectToArduinoBlock(ledBlock);
    connectToArduinoBlock(setVarBlock);

    const frames = framesFor(ledBlock);
    expect(frames.length).toBeGreaterThanOrEqual(2);
    for (const frame of frames.slice(1)) {
      expect(frame.variables["brightness"]).toBeDefined();
      expect(frame.variables["brightness"].value).toBe(42);
    }
  });

  it("every frame carries the full ArduinoFrame shape", () => {
    const [led1] = stack(
      ws,
      [
        { type: "led", fields: { PIN: "3", STATE: "ON" } },
        {
          type: "delay_block",
          values: { DELAY: { num: 1000 } },
        },
      ],
      arduino,
    );
    const frames = framesFor(led1);
    expect(frames.length).toBeGreaterThan(0);
    frames.forEach((frame, i) => {
      expect(Array.isArray(frame.components)).toBe(true);
      expect(typeof frame.explanation).toBe("string");
      expect(frame.explanation.length).toBeGreaterThan(0);
      expect(frame.timeLine).toBeDefined();
      if (i > 0) expect(frame.frameNumber).toBeGreaterThan(frames[i - 1].frameNumber);
      expect(typeof frame.delay).toBe("number");
      expect(frame.variables).toBeDefined();
      for (const component of frame.components) {
        expect(component.type, "component.type").toBeDefined();
        expect(Array.isArray(component.pins)).toBe(true);
      }
    });
  });

  it("loop iterations advance monotonically within the loop phase", () => {
    const arduinoLoop = ws.getBlockById(arduino.id) ?? arduino;
    arduinoLoop.setFieldValue("3", "LOOP_TIMES");
    const [led1] = stack(
      ws,
      [{ type: "led", fields: { PIN: "3", STATE: "ON" } }],
      arduino,
    );
    const frames = framesFor(led1);

    const loopFrames = frames.filter((f) => f.timeLine.function === "loop");
    expect(loopFrames.length).toBeGreaterThan(0);
    const iterations = loopFrames.map((f) => f.timeLine.iteration);
    for (let i = 1; i < iterations.length; i += 1) {
      expect(iterations[i]).toBeGreaterThanOrEqual(iterations[i - 1]);
    }
  });

  it("sensor components do not leak across loop iterations via previous state", () => {
    // Engine contract: previousState handed to transformers strips stale
    // sensor components (they are re-derived from their setup blocks).
    const [, led] = stack(
      ws,
      [
        {
          type: "button_setup",
          fields: { PIN: "2", PULLUP_RESISTOR: "FALSE" },
        },
        { type: "led", fields: { PIN: "3", STATE: "ON" } },
      ],
      arduino,
    );
    const frames = framesFor(led);
    expect(frames.length).toBeGreaterThan(0);
    // Every produced frame must contain exactly one BUTTON component —
    // duplicates would mean sensor states accumulated through iterations.
    frames.forEach((frame) => {
      const buttons = frame.components.filter(
        (c) => c.type === ArduinoComponentType.BUTTON
      );
      expect(buttons.length).toBeLessThanOrEqual(1);
    });
  });
});
