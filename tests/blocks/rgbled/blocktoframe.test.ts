/**
 * RGB LED blocks — setup frame shape + color changes.
 * Rewritten from the bespoke blocktoframe test; every assertion kept.
 */
import type { BlockSvg, Workspace } from "blockly";
import { describe, it, beforeEach, afterEach, expect } from "vitest";

import "@/core/blockly/blocks";
import "../../app/fake-block";
import { ARDUINO_PINS } from "@/core/microcontroller/selectBoard";
import {
  ArduinoFrame,
  ArduinoComponentType,
} from "@/core/frames/arduino.frame";
import type { LedColorState } from "@/blocks/rgbled/state";
import {
  createArduinoAndWorkSpace,
  createTestEvent,
} from "../../app/tests.helper";
import { eventToFrameFactory } from "@/core/frames/event-to-frame.factory";
import {
  stack,
  framesFor,
} from "../_harness/block.harness";

describe("rgb led blocks", () => {
  let ws: Workspace;
  let arduinoBlock: BlockSvg;
  let ledColorSetup: BlockSvg;

  beforeEach(() => {
    [ws, arduinoBlock] = createArduinoAndWorkSpace();
    ledColorSetup = ws.newBlock("rgb_led_setup") as BlockSvg;
    ledColorSetup.setFieldValue("11", "PIN_RED_1");
    ledColorSetup.setFieldValue("10", "PIN_GREEN_1");
    ledColorSetup.setFieldValue("9", "PIN_BLUE_1");
  });
  afterEach(() => {
    ws.dispose();
  });

  it("generates the exact setup state for rgb_led_setup", () => {
    const ledColorState: LedColorState = {
      pins: [ARDUINO_PINS.PIN_11, ARDUINO_PINS.PIN_10, ARDUINO_PINS.PIN_9],
      redPin: ARDUINO_PINS.PIN_11,
      greenPin: ARDUINO_PINS.PIN_10,
      bluePin: ARDUINO_PINS.PIN_9,
      ledNumber: 1,
      color: { green: 0, red: 0, blue: 0 },
      type: ArduinoComponentType.LED_COLOR,
    };

    const expected: ArduinoFrame = {
      blockId: ledColorSetup.id,
      blockName: "rgb_led_setup",
      timeLine: { function: "pre-setup", iteration: 0 },
      explanation: "Setting up color RGB Led.",
      components: [ledColorState],
      variables: {},
      txLedOn: false,
      builtInLedOn: false,
      sendMessage: "",
      delay: 0,
      powerLedOn: true,
      frameNumber: 1,
    };

    expect(eventToFrameFactory(createTestEvent(ledColorSetup.id)).frames).toEqual([
      expected,
    ]);
  });

  it("changes the led color across sequential set_color_led blocks", () => {
    const [, setColor2] = stack(
      ws,
      [
        {
          type: "set_color_led",
          values: { COLOR: { color: { red: 200, blue: 0, green: 200 } } },
        },
        {
          type: "set_color_led",
          values: { COLOR: { color: { red: 200, blue: 100, green: 0 } } },
        },
      ],
      arduinoBlock,
    );

    const [, state2, state3] = framesFor(setColor2);

    expect(state2.explanation).toBe(
      "Setting led color to (red=200,green=200,blue=0).",
    );
    expect(state2.components.length).toBe(1);
    const [component2] = state2.components as LedColorState[];
    expect(component2.color).toEqual({ red: 200, green: 200, blue: 0 });
    expect(component2.type).toBe(ArduinoComponentType.LED_COLOR);

    expect(state3.explanation).toBe(
      "Setting led color to (red=200,green=0,blue=100).",
    );
    expect(state3.components.length).toBe(1);
    const [component3] = state3.components as LedColorState[];
    expect(component3.color).toEqual({ red: 200, green: 0, blue: 100 });
  });
});
