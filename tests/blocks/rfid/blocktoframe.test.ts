/**
 * RFID setup-block frame regression — harness-style spec.
 * All assertions from the original bespoke test are preserved.
 */
import { describe, it, beforeEach, afterEach, expect } from "vitest";

import "@/core/blockly/blocks";
import type { Workspace, BlockSvg } from "blockly";
import { ARDUINO_PINS } from "@/core/microcontroller/selectBoard";
import { saveSensorSetupBlockData } from "@/core/blockly/actions/saveSensorSetupBlockData";
import { updater } from "@/core/blockly/updater";
import {
  ArduinoFrame,
  ArduinoComponentType,
} from "@/core/frames/arduino.frame";
import {
  createArduinoAndWorkSpace,
  createTestEvent,
} from "../../app/tests.helper";
import type { RfidState } from "@/blocks/rfid/state";
import { eventToFrameFactory } from "@/core/frames/event-to-frame.factory";

describe("rfid state factories", () => {
  let workspace: Workspace;
  let rfidBlock: BlockSvg;

  afterEach(() => {
    workspace.dispose();
  });

  beforeEach(() => {
    [workspace] = createArduinoAndWorkSpace();

    rfidBlock = workspace.newBlock("rfid_setup") as BlockSvg;
    rfidBlock.setFieldValue(ARDUINO_PINS.PIN_6, "PIN_TX");
    rfidBlock.setFieldValue(ARDUINO_PINS.PIN_7, "PIN_RX");

    rfidBlock.setFieldValue("TRUE", "scanned_card");
    rfidBlock.setFieldValue("card_num", "card_number");
    rfidBlock.setFieldValue("tag", "tag");

    saveSensorSetupBlockData(createTestEvent(rfidBlock.id)).forEach(updater);
  });

  it("should be able generate state for rfid setup block", () => {
    const rfidComponent: RfidState = {
      pins: [ARDUINO_PINS.PIN_6, ARDUINO_PINS.PIN_7],
      txPin: ARDUINO_PINS.PIN_6,
      rxPin: ARDUINO_PINS.PIN_7,
      scannedCard: true,
      cardNumber: "card_num",
      tag: "tag",
      type: ArduinoComponentType.RFID,
    };

    const rfidSetupState: ArduinoFrame = {
      blockId: rfidBlock.id,
      blockName: "rfid_setup",
      timeLine: { function: "pre-setup", iteration: 0 },
      explanation: "Setting up RFID.",
      components: [rfidComponent],
      variables: {},
      txLedOn: false,
      builtInLedOn: false,
      sendMessage: "",
      delay: 0,
      powerLedOn: true,
      frameNumber: 1,
    };

    expect(eventToFrameFactory(createTestEvent(rfidBlock.id)).frames).toEqual([
      rfidSetupState,
    ]);
  });
});
