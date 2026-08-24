/**
 * time_setup regression: converts the seconds field into a TIME component on
 * the pre-setup frame. Full frame shape locked via toEqual.
 */
import "@/core/blockly/blocks";
import type { Workspace, BlockSvg } from "blockly";

import { eventToFrameFactory } from "@/core/frames/event-to-frame.factory";
import {
  ArduinoFrame,
  ArduinoComponentType,
} from "@/core/frames/arduino.frame";
import { TimeState } from "@/blocks/time/state";
import {
  createArduinoAndWorkSpace,
  createTestEvent,
} from "../../app/tests.helper";
import { describe, it, beforeEach, afterEach, expect } from "vitest";

describe("time state factories", () => {
  let workspace: Workspace;
  let timesetup: BlockSvg;

  afterEach(() => {
    workspace.dispose();
  });

  beforeEach(() => {
    [workspace] = createArduinoAndWorkSpace();
    timesetup = workspace.newBlock("time_setup") as BlockSvg;

    timesetup.setFieldValue(".3", "time_in_seconds");
  });

  it("time_setup generates the full setup frame with the interval", () => {
    const event = createTestEvent(timesetup.id);

    const timeState: TimeState = {
      pins: [],
      timeInSeconds: 0.3,
      type: ArduinoComponentType.TIME,
    };

    const state: ArduinoFrame = {
      blockId: timesetup.id,
      blockName: "time_setup",
      timeLine: { function: "pre-setup", iteration: 0 },
      explanation: "Setting up Arduino time.",
      components: [timeState],
      variables: {},
      txLedOn: false,
      builtInLedOn: false,
      sendMessage: "", // message arduino is sending
      delay: 0, // Number of milliseconds to delay
      powerLedOn: true,
      frameNumber: 1,
    };

    expect(eventToFrameFactory(event).frames).toEqual([state]);
  });
});
