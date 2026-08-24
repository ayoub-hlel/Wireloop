/**
 * Arduino scaffolding blocks (src/blocks/arduino) — previously untested.
 *
 * These blocks define the program skeleton: arduino_loop (with LOOP_TIMES
 * driving virtual-circuit iterations), arduino_setup (runs once, before the
 * loop). No dedicated transformer exists; their "frame effect" is how they
 * shape the frame timeline of the blocks attached to them.
 */
import type { BlockSvg, Workspace } from "blockly";
import { describe, it, beforeEach, afterEach, expect } from "vitest";

import "@/core/blockly/blocks";
import {
  createArduinoAndWorkSpace,
  createTestEvent,
} from "../app/tests.helper";
import { eventToFrameFactory } from "@/core/frames/event-to-frame.factory";
import { connectToArduinoBlock } from "@/core/blockly/helpers/block.helper";
import { getBlockByType } from "@/core/blockly/helpers/block.helper";
import { expectFrame } from "../blocks/_harness/block.harness";

describe("arduino scaffolding blocks", () => {
  let ws: Workspace;
  let arduinoBlock: BlockSvg;

  beforeEach(() => {
    [ws, arduinoBlock] = createArduinoAndWorkSpace();
  });
  afterEach(() => {
    ws.dispose();
  });

  it("LOOP_TIMES drives how many loop iterations produce frames", () => {
    arduinoBlock.setFieldValue("3", "LOOP_TIMES");

    const write = ws.newBlock("digital_write");
    write.setFieldValue("3", "PIN");
    write.setFieldValue("ON", "STATE");
    connectToArduinoBlock(write);

    const frames = eventToFrameFactory(createTestEvent(write.id)).frames;
    // one frame per loop iteration, all turning pin 3 on
    expect(frames.length).toBe(3);
    for (const frame of frames) {
      expectFrame(frame, {
        count: 1,
        components: [{ pins: ["3"], state: 1 }],
        explanation: "Turning pin 3 on.",
      });
    }
  });

  it("setup-attached blocks run once in the setup phase, ahead of loop frames", () => {
    const setupLed = ws.newBlock("digital_write");
    setupLed.setFieldValue("5", "PIN");
    setupLed.setFieldValue("ON", "STATE");
    // connectToArduinoBlock prefers an arduino_setup block when present
    const setupBlock = ws.newBlock("arduino_setup");
    void setupBlock;
    connectToArduinoBlock(setupLed);

    const loopLed = ws.newBlock("digital_write");
    loopLed.setFieldValue("7", "PIN");
    loopLed.setFieldValue("OFF", "STATE");
    const loopConn = getBlockByType("arduino_loop").getInput("loop")!.connection!;
    loopConn.connect(loopLed.previousConnection!);

    const [setupFrame, ...loopFrames] = eventToFrameFactory(
      createTestEvent(setupLed.id),
    ).frames;

    expect(setupFrame.timeLine.function).toBe("setup");
    expect(setupFrame.components.map((c) => c.pins)).toEqual([["5"]]);

    expect(loopFrames.length).toBeGreaterThan(0);
    for (const frame of loopFrames) {
      expect(frame.timeLine.function).toBe("loop");
      // the setup-phase led carries forward as previous state into the loop
      expect(
        frame.components.some((c) => c.pins.includes("5")),
        "setup led persists into loop frames",
      ).toBe(true);
    }
  });
});
