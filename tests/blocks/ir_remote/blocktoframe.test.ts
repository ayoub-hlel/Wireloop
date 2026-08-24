/**
 * IR remote block regression — rewritten on the shared harness.
 * The setup-block test asserts the FULL frame shape via toEqual; everything
 * else uses harness assertions. All original assertions preserved.
 */
import { describe, it, beforeEach, afterEach, expect } from "vitest";
import type { Workspace, BlockSvg } from "blockly";

import "@/core/blockly/blocks";
import {
  createArduinoAndWorkSpace,
  createTestEvent,
} from "../../app/tests.helper";
import { ARDUINO_PINS } from "@/core/microcontroller/selectBoard";
import { updater } from "@/core/blockly/updater";
import { saveSensorSetupBlockData } from "@/core/blockly/actions/saveSensorSetupBlockData";
import {
  ArduinoComponentType,
  ArduinoFrame,
} from "@/core/frames/arduino.frame";
import { eventToFrameFactory } from "@/core/frames/event-to-frame.factory";
import type { IRRemoteState } from "@/blocks/ir_remote/state";

describe("ir remote state factories", () => {
  let workspace: Workspace;
  let irRemoteSetup: BlockSvg;

  afterEach(() => {
    workspace.dispose();
  });

  beforeEach(() => {
    [workspace] = createArduinoAndWorkSpace();
    irRemoteSetup = workspace.newBlock("ir_remote_setup") as BlockSvg;
    irRemoteSetup.setFieldValue(ARDUINO_PINS.PIN_A4, "PIN");
    irRemoteSetup.setFieldValue("TRUE", "scanned_new_code");
    irRemoteSetup.setFieldValue("32343", "code");

    const event = createTestEvent(irRemoteSetup.id);
    saveSensorSetupBlockData(event).forEach(updater);
  });

  it("ir_remote_setup generates the full setup frame", () => {
    const event = createTestEvent(irRemoteSetup.id);

    const irRemote: IRRemoteState = {
      code: "32343",
      pins: [ARDUINO_PINS.PIN_A4],
      hasCode: true,
      analogPin: ARDUINO_PINS.PIN_A4,
      type: ArduinoComponentType.IR_REMOTE,
    };

    const state: ArduinoFrame = {
      blockId: irRemoteSetup.id,
      blockName: "ir_remote_setup",
      timeLine: { function: "pre-setup", iteration: 0 },
      explanation: "Setting up ir remote.",
      components: [irRemote],
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
