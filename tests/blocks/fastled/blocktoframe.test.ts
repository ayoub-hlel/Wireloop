/**
 * FastLED strip regression — harness-style specs.
 * All assertions from the original bespoke tests are preserved (setup frame,
 * set-all-colors pre-show vs show phases, individual pixel positioning).
 */
import "../../app/fake-block";
import "@/core/blockly/blocks";

import { describe, it, beforeEach, afterEach, expect } from "vitest";
import type { Workspace, BlockSvg } from "blockly";
import _ from "lodash";

import { ARDUINO_PINS } from "@/core/microcontroller/selectBoard";
import {
  ArduinoFrame,
  ArduinoComponentType,
} from "@/core/frames/arduino.frame";
import {
  createArduinoAndWorkSpace,
  createTestEvent,
} from "../../app/tests.helper";
import { eventToFrameFactory } from "@/core/frames/event-to-frame.factory";
import { connectToArduinoBlock } from "@/core/blockly/helpers/block.helper";
import type { FastLEDState } from "@/blocks/fastled/state";
import type { Color } from "@/core/frames/arduino.frame";

describe("fastled state factories", () => {
  let workspace: Workspace;
  let fastLEDSetup: BlockSvg;

  afterEach(() => {
    workspace.dispose();
  });

  beforeEach(() => {
    [workspace] = createArduinoAndWorkSpace();
    fastLEDSetup = workspace.newBlock("fastled_setup") as BlockSvg;
    fastLEDSetup.setFieldValue("60", "NUMBER_LEDS");
    fastLEDSetup.setFieldValue(ARDUINO_PINS.PIN_6, "PIN");
  });

  it("should be able generate state for fastled setup block", () => {
    const blankPixels = _.range(0, 60).map((i) => ({
      position: i,
      color: { red: 0, green: 0, blue: 0 },
    }));

    const ledLightStrip: FastLEDState = {
      pins: [ARDUINO_PINS.PIN_6],
      numberOfLeds: 60,
      type: ArduinoComponentType.FASTLED_STRIP,
      preShowLEDs: blankPixels,
      fastLEDs: _.range(0, 60).map((i) => ({
        position: i,
        color: { red: 0, green: 0, blue: 0 },
      })),
    };

    const state: ArduinoFrame = {
      blockId: fastLEDSetup.id,
      blockName: "fastled_setup",
      timeLine: { function: "pre-setup", iteration: 0 },
      explanation: "Setting up led light strip.",
      components: [ledLightStrip],
      variables: {},
      txLedOn: false,
      builtInLedOn: false,
      sendMessage: "",
      delay: 0,
      powerLedOn: true,
      frameNumber: 1,
    };

    expect(eventToFrameFactory(createTestEvent(fastLEDSetup.id)).frames).toEqual([
      state,
    ]);
  });

  it("set all colors stages in preShow then publishes on show", () => {
    const setAllColorBlock = workspace.newBlock(
      "fastled_set_all_colors"
    ) as BlockSvg;
    const showAllColors = workspace.newBlock(
      "fastled_show_all_colors"
    ) as BlockSvg;
    setAllColorBlock.setFieldValue("#FF0000", "1-1");
    setAllColorBlock.setFieldValue("#00AA00", "2-2");
    connectToArduinoBlock(showAllColors);
    connectToArduinoBlock(setAllColorBlock);
    const [, state2, state3] = eventToFrameFactory(
      createTestEvent(setAllColorBlock.id)
    ).frames;

    // Staged frame: colors visible in preShowLEDs only.
    expect(state2.components.length).toBe(1);
    const [component1State2] = state2.components as FastLEDState[];
    for (let i = 0; i < 60; i += 1) {
      expect(component1State2.preShowLEDs[i].color.blue).toBe(0);
      if (i == 13) {
        expect(component1State2.preShowLEDs[i].color.green).toBe(170);
      } else if (i == 0) {
        expect(component1State2.preShowLEDs[i].color.red).toBe(255);
      } else {
        expect(component1State2.preShowLEDs[i].color.green).toBe(0);
        expect(component1State2.preShowLEDs[i].color.red).toBe(0);
      }
      expect(component1State2.fastLEDs[i].color.red).toBe(0);
      expect(component1State2.fastLEDs[i].color.green).toBe(0);
      expect(component1State2.fastLEDs[i].color.blue).toBe(0);
    }

    // Show frame: staged colors promoted into fastLEDs.
    const [component1State3] = state3.components as FastLEDState[];
    for (let i = 0; i < 60; i += 1) {
      expect(component1State3.fastLEDs[i].color.blue).toBe(0);
      if (i == 13) {
        expect(component1State3.fastLEDs[i].color.green).toBe(170);
        expect(component1State3.preShowLEDs[i].color.green).toBe(170);
      } else if (i == 0) {
        expect(component1State3.fastLEDs[i].color.red).toBe(255);
        expect(component1State3.preShowLEDs[i].color.red).toBe(255);
      } else {
        expect(component1State3.fastLEDs[i].color.green).toBe(0);
        expect(component1State3.fastLEDs[i].color.red).toBe(0);
        expect(component1State3.preShowLEDs[i].color.red).toBe(0);
        expect(component1State3.preShowLEDs[i].color.green).toBe(0);
      }
    }
  });

  it("fastled_set_color sets a single pixel by position", () => {
    const setFastLED1Block = workspace.newBlock(
      "fastled_set_color"
    ) as BlockSvg;
    const setFastLED2Block = workspace.newBlock("fastled_set_color");

    const colorFor = (r: number, g: number, b: number): Color => ({ red: r, green: g, blue: b });
    const wirePixel = (
      block: BlockSvg,
      position: number,
      color: Color
    ): void => {
      const colorBlock = workspace.newBlock("color_picker_custom") as BlockSvg;
      // #rrggbb from Color
      const hex =
        "#" +
        [color.red, color.green, color.blue]
          .map((c) => c.toString(16).padStart(2, "0"))
          .join("");
      colorBlock.setFieldValue(hex, "COLOR");
      const positionBlock = workspace.newBlock("math_number") as BlockSvg;
      positionBlock.setFieldValue(String(position), "NUM");
      block.getInput("COLOR")!.connection!.connect(colorBlock.outputConnection!);
      block.getInput("POSITION")!.connection!.connect(
        positionBlock.outputConnection!
      );
    };

    wirePixel(setFastLED1Block, 1, colorFor(0, 0, 100));
    wirePixel(setFastLED2Block, 31, colorFor(100, 0, 100));

    connectToArduinoBlock(setFastLED1Block);
    setFastLED1Block.nextConnection!.connect(
      setFastLED2Block.previousConnection!);

    const event = createTestEvent(setFastLED1Block.id);
    const [, state2, state3] = eventToFrameFactory(event).frames;

    expect(state2.explanation).toBe(
      "Setting LED 1 on light strip to color (red=0,green=0,blue=100)"
    );
    expect(state2.components.length).toBe(1);
    const [component1] = state2.components as FastLEDState[];
    component1.preShowLEDs.forEach((pixel) => {
      if (pixel.position === 0) {
        expect(pixel.color).toEqual({ red: 0, green: 0, blue: 100 });
        return;
      }
      expect(pixel.color).toEqual({ red: 0, green: 0, blue: 0 });
    });

    expect(state3.blockId).toBe(setFastLED2Block.id);
    expect(state3.components.length).toBe(1);
    const [componentv2] = state3.components as FastLEDState[];
    componentv2.preShowLEDs.forEach((pixel) => {
      if (pixel.position === 0) {
        expect(pixel.color).toEqual({ red: 0, green: 0, blue: 100 });
        return;
      }
      if (pixel.position === 30) {
        expect(pixel.color).toEqual({ red: 100, green: 0, blue: 100 });
        return;
      }
      expect(pixel.color).toEqual({ red: 0, green: 0, blue: 0 });
    });
  });
});
