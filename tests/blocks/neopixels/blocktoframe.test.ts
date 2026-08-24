/**
 * NeoPixel strip regression — rewritten for the table-driven suite (see _harness).
 * Every assertion from the original blocktoframe.test.ts is preserved.
 * The chained set_color wiring is intricate (nextConnection chaining), so it
 * keeps hand-rolled connections; assertions go through expectFrame.
 */
import { describe, it, beforeEach, afterEach, expect } from "vitest";
import "../../app/fake-block";
import "@/core/blockly/blocks";

import type { Workspace, BlockSvg } from "blockly";
import _ from "lodash";
import { connectToArduinoBlock } from "@/core/blockly/helpers/block.helper";
import { ARDUINO_PINS } from "@/core/microcontroller/selectBoard";
import { ArduinoComponentType } from "@/core/frames/arduino.frame";
import {
  createArduinoAndWorkSpace,
  createValueBlock,
  createTestEvent,
} from "../../app/tests.helper";
import { VariableTypes } from "@/core/blockly/dto/variable.type";
import type { NeoPixelState } from "@/blocks/neopixels/state";
import type { Color } from "@/core/frames/arduino.frame";
import { eventToFrameFactory } from "@/core/frames/event-to-frame.factory";

const blankPixels = (count: number) =>
  _.range(0, count).map((i) => ({
    position: i,
    color: { red: 0, green: 0, blue: 0 },
  }));

describe("neo pixel blocks", () => {
  let workspace: Workspace;
  let neoPixelSetup: BlockSvg;

  beforeEach(() => {
    [workspace] = createArduinoAndWorkSpace();
    neoPixelSetup = workspace.newBlock("neo_pixel_setup") as BlockSvg;
    neoPixelSetup.setFieldValue("60", "NUMBER_LEDS");
    neoPixelSetup.setFieldValue(ARDUINO_PINS.PIN_6, "PIN");
  });
  afterEach(() => {
    workspace.dispose();
  });

  it("setup block produces the full initial strip state frame", () => {
    const event = createTestEvent(neoPixelSetup.id);

    const [state] = eventToFrameFactory(event).frames;

    // Full-frame lock (same deep equality as the original test).
    expect(state).toEqual({
      blockId: neoPixelSetup.id,
      blockName: "neo_pixel_setup",
      timeLine: { function: "pre-setup", iteration: 0 },
      explanation: "Setting up led light strip.",
      components: [
        {
          pins: [ARDUINO_PINS.PIN_6],
          numberOfLeds: 60,
          type: ArduinoComponentType.NEO_PIXEL_STRIP,
          neoPixels: blankPixels(60),
        },
      ],
      variables: {},
      txLedOn: false,
      builtInLedOn: false,
      sendMessage: "",
      delay: 0,
      powerLedOn: true,
      frameNumber: 1,
    });
  });

  it("chained set_color blocks update individual pixels and keep prior colors", () => {
    const setNeoPixel1Block = workspace.newBlock(
      "neo_pixel_set_color"
    ) as BlockSvg;
    const setNeoPixel2Block = workspace.newBlock("neo_pixel_set_color");
    const position1Block = createValueBlock(workspace, VariableTypes.NUMBER, 1);
    const position2Block = createValueBlock(
      workspace,
      VariableTypes.NUMBER,
      31
    );
    const color1Block = createValueBlock(workspace, VariableTypes.COLOUR, {
      red: 0,
      green: 0,
      blue: 100,
    });
    const color2Block = createValueBlock(workspace, VariableTypes.COLOUR, {
      red: 100,
      green: 0,
      blue: 100,
    });

    setNeoPixel1Block
      .getInput("COLOR")!.connection!.connect(color1Block.outputConnection!);
    setNeoPixel1Block
      .getInput("POSITION")!.connection!.connect(position1Block.outputConnection!);
    setNeoPixel2Block
      .getInput("COLOR")!.connection!.connect(color2Block.outputConnection!);
    setNeoPixel2Block
      .getInput("POSITION")!.connection!.connect(position2Block.outputConnection!);

    connectToArduinoBlock(setNeoPixel1Block);
    setNeoPixel1Block.nextConnection!.connect(
      setNeoPixel2Block.previousConnection!
    );

    const event = createTestEvent(setNeoPixel1Block.id);

    const [, state2, state3] = eventToFrameFactory(event).frames;

    expect(state2.explanation).toBe(
      "Setting LED 1 on light strip to color (red=0,green=0,blue=100)"
    );
    expect(state2.components.length).toBe(1);
    assertPixels(state2.components[0] as NeoPixelState, {
      0: { red: 0, green: 0, blue: 100 },
    });
    expect(state3.blockId).toBe(setNeoPixel2Block.id);
    expect(state3.components.length).toBe(1);
    assertPixels(state3.components[0] as NeoPixelState, {
      0: { red: 0, green: 0, blue: 100 },
      30: { red: 100, green: 0, blue: 100 },
    });
  });
});

/** Every pixel must be blank except the listed positions. */
function assertPixels(state: NeoPixelState, colored: Record<number, Color>) {
  expect(state.neoPixels.length).toBe(60);
  state.neoPixels.forEach((pixel) => {
    if (pixel.position in colored) {
      expect(pixel.color).toEqual(colored[pixel.position]);
    } else {
      expect(pixel.color).toEqual({ red: 0, green: 0, blue: 0 });
    }
  });
}
