/**
 * Button frame regression — harness-style specs.
 * All assertions from the original bespoke tests are preserved; the
 * pullup-resistor flag case is an added contract for ButtonState.usePullup.
 */
import { describe, it, beforeEach, afterEach, expect } from "vitest";

import "@/core/blockly/blocks";
import type { Workspace, BlockSvg } from "blockly";
import {
  createArduinoAndWorkSpace,
  createTestEvent,
} from "../../app/tests.helper";
import { saveSensorSetupBlockData } from "@/core/blockly/actions/saveSensorSetupBlockData";
import { updater } from "@/core/blockly/updater";
import { ARDUINO_PINS } from "@/core/microcontroller/selectBoard";
import {
  ArduinoComponentType,
  ArduinoFrame,
} from "@/core/frames/arduino.frame";
import { eventToFrameFactory } from "@/core/frames/event-to-frame.factory";
import type { ButtonState } from "@/blocks/button/state";
import { connectToArduinoBlock } from "@/core/blockly/helpers/block.helper";

/** Full-frame builder so every scalar stays asserted, not just components. */
const expectedFrame = (
  block: BlockSvg,
  blockName: string,
  timeline: ArduinoFrame["timeLine"],
  explanation: string,
  components: ButtonState[],
  frameNumber: number,
): ArduinoFrame => ({
  blockId: block.id,
  blockName,
  timeLine: timeline,
  explanation,
  components,
  variables: {},
  txLedOn: false,
  builtInLedOn: false,
  sendMessage: "",
  delay: 0,
  powerLedOn: true,
  frameNumber,
});

const buttonState = (
  pin: string,
  isPressed: boolean,
  usePullup = false,
): ButtonState => ({
  isPressed,
  pins: [pin as ARDUINO_PINS],
  type: ArduinoComponentType.BUTTON,
  usePullup,
});

describe("button state factories", () => {
  let workspace: Workspace;
  let buttonSetup: BlockSvg;

  beforeEach(() => {
    [workspace] = createArduinoAndWorkSpace();
  });

  afterEach(() => {
    workspace.dispose();
  });

  const registerSetup = (pin: string, pressed: boolean, pullup = false) => {
    buttonSetup = workspace.newBlock("button_setup") as BlockSvg;
    buttonSetup.setFieldValue(pin, "PIN");
    buttonSetup.setFieldValue(pressed ? "TRUE" : "FALSE", "is_pressed");
    buttonSetup.setFieldValue(pullup ? "TRUE" : "FALSE", "PULLUP_RESISTOR");
    saveSensorSetupBlockData(createTestEvent(buttonSetup.id)).forEach(updater);
    return buttonSetup;
  };

  it("should be able generate state for button setup block", () => {
    registerSetup("3", true);

    const state = expectedFrame(
      buttonSetup,
      "button_setup",
      { function: "pre-setup", iteration: 0 },
      "Button 3 is being setup.",
      [buttonState(ARDUINO_PINS.PIN_3, true)],
      1,
    );

    expect(eventToFrameFactory(createTestEvent(buttonSetup.id)).frames).toEqual([
      state,
    ]);
  });

  it("pullup resistor setting flows into the component state", () => {
    registerSetup("4", true, true);

    const [frame] = eventToFrameFactory(
      createTestEvent(buttonSetup.id)
    ).frames;
    expect((frame.components[0] as ButtonState).usePullup).toBe(true);
  });

  it("should be able to release button after it has been pressed in the loop", () => {
    registerSetup("3", true);

    const releaseButton1 = workspace.newBlock("release_button") as BlockSvg;
    releaseButton1.setFieldValue("RELEASED", "STATE");
    const releaseButton2 = workspace.newBlock("release_button") as BlockSvg;
    releaseButton2.setFieldValue("PRESSED", "STATE");

    connectToArduinoBlock(releaseButton2);
    connectToArduinoBlock(releaseButton1);

    const frames = eventToFrameFactory(
      createTestEvent(releaseButton1.id)
    ).frames;

    expect(frames[1]).toEqual(
      expectedFrame(
        releaseButton1,
        "release_button",
        { function: "loop", iteration: 1 },
        "Button 3 is being released.",
        [buttonState(ARDUINO_PINS.PIN_3, false)],
        2,
      ),
    );
    expect(frames[2]).toEqual(
      expectedFrame(
        releaseButton2,
        "release_button",
        { function: "loop", iteration: 1 },
        "Button 3 is being pressed.",
        [buttonState(ARDUINO_PINS.PIN_3, true)],
        3,
      ),
    );
  });
});
