/**
 * Color block regression — rewritten for the table-driven suite (see _harness).
 * Merged from blocktovalue.color-simple.test.ts + blocktovalue.color-rgb.test.ts.
 * Every original assertion is preserved. These flows are variable-centric
 * (colour stored into variables), so they keep raw workspace wiring instead
 * of the declarative stack helper.
 */
import { describe, it, beforeEach, afterEach, expect } from "vitest";

import "@/core/blockly/blocks";
import "../../app/fake-block";
import type { Workspace } from "blockly";
import { VariableTypes } from "@/core/blockly/dto/variable.type";
import { connectToArduinoBlock } from "@/core/blockly/helpers/block.helper";
import type { Color } from "@/core/frames/arduino.frame";
import {
  createArduinoAndWorkSpace,
  createSetVariableBlockWithValue,
  createTestEvent,
  verifyVariable,
} from "../../app/tests.helper";
import { eventToFrameFactory } from "@/core/frames/event-to-frame.factory";

describe("color blocks", () => {
  let workspace: Workspace;

  beforeEach(() => {
    [workspace] = createArduinoAndWorkSpace();
  });
  afterEach(() => {
    workspace.dispose();
  });

  it("color picker block stores the exact picked rgb value", () => {
    const colorPickerVariable = createSetVariableBlockWithValue(
      workspace,
      "color_test",
      VariableTypes.COLOUR,
      { red: 92, green: 230, blue: 147 }
    );
    connectToArduinoBlock(colorPickerVariable);

    const event = createTestEvent(colorPickerVariable.id);
    const [state1event1] = eventToFrameFactory(event).frames;

    expect(state1event1.explanation).toBe(
      'Variable "color_test" stores (red=92,green=230,blue=147).'
    );
    verifyVariable(
      "color_test",
      VariableTypes.COLOUR,
      { red: 92, green: 230, blue: 147 },
      state1event1.variables
    );

    const randomColorBlock = workspace.newBlock("colour_random");
    colorPickerVariable
      .getInput("VALUE")!.connection!.targetBlock()!
      .dispose(true);
    colorPickerVariable
      .getInput("VALUE")!.connection!.connect(randomColorBlock.outputConnection!);

    const event2 = createTestEvent(colorPickerVariable.id);
    const [state1event2] = eventToFrameFactory(event2).frames;

    expect(state1event1.explanation).toContain(
      'Variable "color_test" stores (red='
    );
    const color = state1event2.variables["color_test"].value as Color;
    expect(color).toBeDefined();
    expect(color.blue > 0).toBeTruthy();
    expect(color.red > 0).toBeTruthy();
    expect(color.green > 0).toBeTruthy();
  });

  it("rgb color block handles number blocks, variables, and blank inputs", () => {
    const numberBlock = workspace.newBlock("math_number");
    const rgbColorBlock = workspace.newBlock("colour_rgb");
    numberBlock.setFieldValue("120", "NUM");

    const setNumberVariable = createSetVariableBlockWithValue(
      workspace,
      "color",
      VariableTypes.NUMBER,
      100
    );

    const getVariableNumberBlock = workspace.newBlock("variables_get_number");
    getVariableNumberBlock.setFieldValue(
      setNumberVariable.getFieldValue("VAR"),
      "VAR"
    );

    const setColorVariable = createSetVariableBlockWithValue(
      workspace,
      "color_test",
      VariableTypes.COLOUR,
      { red: 255, green: 0, blue: 0 }
    );
    setColorVariable.getInput("VALUE")!.connection!.targetBlock()!.dispose(true);
    setColorVariable
      .getInput("VALUE")!.connection!.connect(rgbColorBlock.outputConnection!);

    connectToArduinoBlock(setColorVariable);
    connectToArduinoBlock(setNumberVariable);

    [
      {
        expectedValue: { red: 120, green: 100, blue: 0 },
        red: numberBlock,
        green: getVariableNumberBlock,
        blue: undefined,
      },
      {
        expectedValue: { red: 0, green: 100, blue: 120 },
        red: null,
        green: getVariableNumberBlock,
        blue: numberBlock,
      },
      {
        expectedValue: { red: 120, green: 0, blue: 100 },
        red: numberBlock,
        green: null,
        blue: getVariableNumberBlock,
      },
    ].forEach(({ red, green, blue, expectedValue }) => {
      if (rgbColorBlock.getInput("RED")!.connection!.isConnected()) {
        rgbColorBlock.getInput("RED")!.connection!.disconnect();
      }

      if (rgbColorBlock.getInput("GREEN")!.connection!.isConnected()) {
        rgbColorBlock.getInput("GREEN")!.connection!.disconnect();
      }

      if (rgbColorBlock.getInput("BLUE")!.connection!.isConnected()) {
        rgbColorBlock.getInput("BLUE")!.connection!.disconnect();
      }

      if (red) {
        rgbColorBlock.getInput("RED")!.connection!.connect(red.outputConnection!);
      }
      if (green) {
        rgbColorBlock
          .getInput("GREEN")!.connection!.connect(green.outputConnection!);
      }
      if (blue) {
        rgbColorBlock
          .getInput("BLUE")!.connection!.connect(blue.outputConnection!);
      }

      const event = createTestEvent(rgbColorBlock.id);

      const [, state2] = eventToFrameFactory(event).frames;
      expect(state2.explanation).toBe(
        `Variable "color_test" stores (red=${expectedValue.red},green=${expectedValue.green},blue=${expectedValue.blue}).`
      );
      expect(state2.variables["color_test"].value).toEqual(expectedValue);
    });
  });
});
