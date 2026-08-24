/**
 * Text block regression — value factories (text_join, text_length,
 * text_changeCase, text_isEmpty, number_to_string, parse_string_block).
 *
 * Rewritten from six bespoke files into one data-first suite. Every original
 * assertion is preserved verbatim in intent; shared variable-set wiring lives
 * in setVar().
 */
import type { Workspace, BlockSvg } from "blockly";
import { describe, it, beforeEach, afterEach, expect } from "vitest";

import "@/core/blockly/blocks";
import { VariableTypes } from "@/core/blockly/dto/variable.type";
import { connectToArduinoBlock } from "@/core/blockly/helpers/block.helper";
import { eventToFrameFactory } from "@/core/frames/event-to-frame.factory";
import {
  createArduinoAndWorkSpace,
  createSetVariableBlockWithValue,
  createTestEvent,
} from "../../app/tests.helper";

let ws: Workspace;

afterEach(() => ws.dispose());
beforeEach(() => {
  [ws] = createArduinoAndWorkSpace();
});

/** Creates a variables_set block for `name`, replacing its literal VALUE input
 * with the output of `expr`. */
const setVarTo = (
  name: string,
  type: VariableTypes,
  expr: BlockSvg,
): BlockSvg => {
  const initial =
    type === VariableTypes.NUMBER
      ? 0
      : type === VariableTypes.BOOLEAN
        ? true
        : "";
  const block = createSetVariableBlockWithValue(
    ws,
    name,
    type,
    initial as never,
  );
  block.getInput("VALUE")!.connection!.targetBlock()!.dispose(true);
  block.getInput("VALUE")!.connection!.connect(expr.outputConnection!);
  return block;
};

describe("text_changeCase", () => {
  it("changes case of a text block, a string variable, or nothing", () => {
    const textChangeCase = ws.newBlock("text_changeCase");
    const textBlock = ws.newBlock("text");
    textBlock.setFieldValue("hEllo WorLD", "TEXT");
    const setStringVariable = createSetVariableBlockWithValue(
      ws,
      "random_text",
      VariableTypes.STRING,
      "hEllo WorLD",
    );
    const testStringVariable = setVarTo(
      "test_string",
      VariableTypes.STRING,
      textChangeCase,
    );

    // From a literal text block
    textChangeCase
      .getInput("TEXT")!
      .connection!.connect(textBlock.outputConnection!);
    connectToArduinoBlock(testStringVariable);

    for (const { type, expectedValue } of [
      { type: "UPPERCASE", expectedValue: "HELLO WORLD" },
      { type: "LOWERCASE", expectedValue: "hello world" },
    ]) {
      textChangeCase.setFieldValue(type, "CASE");
      const [frame] = eventToFrameFactory(
        createTestEvent(textChangeCase.id),
      ).frames;
      expect(frame.explanation).toBe(
        `Variable "test_string" stores "${expectedValue}".`,
      );
      expect(frame.variables["test_string"].value).toBe(expectedValue);
    }

    // From a string variable
    textBlock.dispose(true);
    const getStringVariable = ws.newBlock("variables_get_string");
    getStringVariable.setFieldValue(
      setStringVariable.getFieldValue("VAR"),
      "VAR",
    );
    textChangeCase
      .getInput("TEXT")!
      .connection!.connect(getStringVariable.outputConnection!);
    connectToArduinoBlock(setStringVariable);

    for (const { type, expectedValue } of [
      { type: "UPPERCASE", expectedValue: "HELLO WORLD" },
      { type: "LOWERCASE", expectedValue: "hello world" },
    ]) {
      textChangeCase.setFieldValue(type, "CASE");
      const [, frame] = eventToFrameFactory(
        createTestEvent(textChangeCase.id),
      ).frames;
      expect(frame.explanation).toBe(
        `Variable "test_string" stores "${expectedValue}".`,
      );
      expect(frame.variables["test_string"].value).toBe(expectedValue);
    }

    // With no input at all
    getStringVariable.dispose(true);
    setStringVariable.dispose(true);

    for (const { type } of [
      { type: "UPPERCASE" },
      { type: "LOWERCASE" },
    ]) {
      textChangeCase.setFieldValue(type, "CASE");
      const [frame] = eventToFrameFactory(
        createTestEvent(textChangeCase.id),
      ).frames;
      expect(frame.explanation).toBe(`Variable "test_string" stores "".`);
      expect(frame.variables["test_string"].value).toBe("");
    }
  });
});

describe("text_isEmpty", () => {
  it("detects whether a text block, variable, or nothing is empty", () => {
    const textIsEmpty = ws.newBlock("text_isEmpty");
    const textBlock = ws.newBlock("text");
    textBlock.setFieldValue("", "TEXT");
    const setStringVariable = createSetVariableBlockWithValue(
      ws,
      "random_text",
      VariableTypes.STRING,
      "blue",
    );
    const testBoolVariable = setVarTo(
      "test_bool",
      VariableTypes.BOOLEAN,
      textIsEmpty,
    );

    // Empty literal -> true
    textIsEmpty
      .getInput("VALUE")!
      .connection!.connect(textBlock.outputConnection!);
    connectToArduinoBlock(testBoolVariable);

    const [state1] = eventToFrameFactory(
      createTestEvent(textIsEmpty.id),
    ).frames;
    expect(state1.explanation).toBe('Variable "test_bool" stores true.');
    expect(state1.variables["test_bool"].value).toBeTruthy();

    // Non-empty variable -> false
    textBlock.dispose(true);
    const getStringVariable = ws.newBlock("variables_get_string");
    getStringVariable.setFieldValue(
      setStringVariable.getFieldValue("VAR"),
      "VAR",
    );
    textIsEmpty
      .getInput("VALUE")!
      .connection!.connect(getStringVariable.outputConnection!);
    connectToArduinoBlock(setStringVariable);

    const [, state2] = eventToFrameFactory(
      createTestEvent(textIsEmpty.id),
    ).frames;
    expect(state2.explanation).toBe('Variable "test_bool" stores false.');
    expect(state2.variables["test_bool"].value).toBeFalsy();

    // Nothing connected -> true
    getStringVariable.dispose(true);
    setStringVariable.dispose(true);

    const [state3] = eventToFrameFactory(
      createTestEvent(setStringVariable.id),
    ).frames;
    expect(state3.explanation).toBe('Variable "test_bool" stores true.');
    expect(state3.variables["test_bool"].value).toBeTruthy();
  });
});

describe("text_join", () => {
  const makeJoin = (itemCount: number) => {
    const join = ws.newBlock("text_join") as BlockSvg;
     
    (join as any).itemCount_ = itemCount;
     
    (join as any).updateShape_();
    return join;
  };

  it("joins text blocks and string variables together", () => {
    const join = makeJoin(3);

    const stringVariableBlock = createSetVariableBlockWithValue(
      ws,
      "usb_word",
      VariableTypes.STRING,
      "3.434.34",
    );
    const getVariableTextBlock = ws.newBlock("variables_get_string");
    getVariableTextBlock.setFieldValue(
      stringVariableBlock.getFieldValue("VAR"),
      "VAR",
    );

    const textBlock1 = ws.newBlock("text");
    textBlock1.setFieldValue("*", "TEXT");
    const textBlock2 = ws.newBlock("text");
    textBlock2.setFieldValue("*", "TEXT");

    join.getInput("ADD0")!.connection!.connect(textBlock1.outputConnection!);
    join
      .getInput("ADD1")!
      .connection!.connect(getVariableTextBlock.outputConnection!);
    join.getInput("ADD2")!.connection!.connect(textBlock2.outputConnection!);

    const setVarBlock = setVarTo(
      "test_string",
      VariableTypes.STRING,
      join,
    );
    connectToArduinoBlock(setVarBlock);
    connectToArduinoBlock(stringVariableBlock);

    const [state1, state2] = eventToFrameFactory(
      createTestEvent(setVarBlock.id),
    ).frames;

    expect(state1.explanation).toBe('Variable "usb_word" stores "3.434.34".');
    expect(state2.explanation).toBe(
      'Variable "test_string" stores "*3.434.34*".',
    );
    expect(state2.variables["test_string"].value).toBe("*3.434.34*");
  });

  it("returns an empty string when nothing is connected", () => {
    const join = makeJoin(3);
    const setVarBlock = setVarTo("test_string", VariableTypes.STRING, join);
    connectToArduinoBlock(setVarBlock);

    const [state1] = eventToFrameFactory(
      createTestEvent(setVarBlock.id),
    ).frames;
    expect(state1.explanation).toBe('Variable "test_string" stores "".');
    expect(state1.variables["test_string"].value).toBe("");
  });
});

describe("text_length", () => {
  it("gets the length of a text block, a string variable, or nothing", () => {
    const textLength = ws.newBlock("text_length");
    const textBlock = ws.newBlock("text");
    textBlock.setFieldValue("blue", "TEXT");
    textLength
      .getInput("VALUE")!
      .connection!.connect(textBlock.outputConnection!);

    const numVariable = ws.createVariable("num_test", "Number");
    const numVarBlock = ws.newBlock("variables_set_number") as BlockSvg;
    numVarBlock.setFieldValue(numVariable.getId(), "VAR");
    numVarBlock
      .getInput("VALUE")!
      .connection!.connect(textLength.outputConnection!);
    connectToArduinoBlock(numVarBlock);

    // Literal "blue" -> 4
    const [state1] = eventToFrameFactory(
      createTestEvent(numVarBlock.id),
    ).frames;
    expect(state1.explanation).toBe('Variable "num_test" stores 4.');
    expect(state1.variables["num_test"].value).toBe(4);

    // Disconnected input -> 0
    textBlock.dispose(true);
    const [state2] = eventToFrameFactory(
      createTestEvent(numVarBlock.id),
    ).frames;
    expect(state2.explanation).toBe('Variable "num_test" stores 0.');
    expect(state2.variables["num_test"].value).toBe(0);

    // String variable "Hello World!" -> 12
    const stringVariableBlock = createSetVariableBlockWithValue(
      ws,
      "test_string",
      VariableTypes.STRING,
      "Hello World!",
    );
    connectToArduinoBlock(stringVariableBlock);
    const getStringVariableBlock = ws.newBlock("variables_get_string");
    getStringVariableBlock.setFieldValue(
      stringVariableBlock.getFieldValue("VAR"),
      "VAR",
    );
    textLength
      .getInput("VALUE")!
      .connection!.connect(getStringVariableBlock.outputConnection!);

    const [, state3] = eventToFrameFactory(
      createTestEvent(numVarBlock.id),
    ).frames;
    expect(state3.explanation).toBe('Variable "num_test" stores 12.');
    expect(state3.variables["num_test"].value).toBe(12);
  });
});

describe("number_to_string", () => {
  it("converts a number block, a number variable, or nothing to text", () => {
    const numberToText = ws.newBlock("number_to_string");
    numberToText.setFieldValue("3", "PRECISION");

    const numberBlock = ws.newBlock("math_number");
    numberBlock.setFieldValue("93.999323", "NUM");
    numberToText
      .getInput("NUMBER")!
      .connection!.connect(numberBlock.outputConnection!);

    const setTextBlock = setVarTo(
      "text_test",
      VariableTypes.STRING,
      numberToText,
    );
    connectToArduinoBlock(setTextBlock);

    // Literal 93.999323 with precision 3 -> "93.999"
    const [state1] = eventToFrameFactory(
      createTestEvent(setTextBlock.id),
    ).frames;
    expect(state1.explanation).toBe('Variable "text_test" stores "93.999".');
    expect(state1.variables["text_test"].value).toBe("93.999");

    // Number variable 333.33399 -> "333.334"
    numberBlock.dispose(true);
    const setNumberVariable = createSetVariableBlockWithValue(
      ws,
      "num",
      VariableTypes.NUMBER,
      "333.33399" as never,
    );
    connectToArduinoBlock(setNumberVariable);
    const getNumberVariable = ws.newBlock("variables_get_number");
    getNumberVariable.setFieldValue(
      setNumberVariable.getFieldValue("VAR"),
      "VAR",
    );
    numberToText
      .getInput("NUMBER")!
      .connection!.connect(getNumberVariable.outputConnection!);

    const [, state2] = eventToFrameFactory(
      createTestEvent(numberBlock.id),
    ).frames;
    expect(state2.explanation).toBe('Variable "text_test" stores "333.334".');
    expect(state2.variables["text_test"].value).toBe("333.334");

    // Nothing connected -> "0.000"
    getNumberVariable.dispose(true);
    setNumberVariable.dispose(true);

    const [state3] = eventToFrameFactory(
      createTestEvent(setNumberVariable.id),
    ).frames;
    expect(state3.explanation).toBe('Variable "text_test" stores "0.000".');
    expect(state3.variables["text_test"].value).toBe("0.000");
  });
});

describe("parse_string_block", () => {
  it("parses delimited strings, handling bad indexes and missing delimiters", () => {
    const textBlock = ws.newBlock("text");
    textBlock.setFieldValue("blue*red*yellow", "TEXT");
    const parse = ws.newBlock("parse_string_block");
    parse.setFieldValue("*", "DELIMITER");
    parse.getInput("VALUE")!.connection!.connect(textBlock.outputConnection!);
    const numberBlock = ws.newBlock("math_number");
    numberBlock.setFieldValue("-1", "NUM");
    parse
      .getInput("POSITION")!
      .connection!.connect(numberBlock.outputConnection!);

    const setTextBlock = setVarTo(
      "text_test",
      VariableTypes.STRING,
      parse,
    );
    connectToArduinoBlock(setTextBlock);

    // Invalid position (-1) -> empty
    const [state1] = eventToFrameFactory(
      createTestEvent(setTextBlock.id),
    ).frames;
    expect(state1.explanation).toBe('Variable "text_test" stores "".');
    expect(state1.variables["text_test"].value).toBe("");

    // Missing delimiter -> empty
    parse.setFieldValue("|", "DELIMITER");
    numberBlock.setFieldValue("1", "NUM");
    const [state2] = eventToFrameFactory(
      createTestEvent(numberBlock.id),
    ).frames;
    expect(state2.explanation).toBe('Variable "text_test" stores "".');
    expect(state2.variables["text_test"].value).toBe("");

    // Positions 1..3 -> blue, red, yellow
    for (const [index, value] of ["blue", "red", "yellow"].entries()) {
      parse.setFieldValue("*", "DELIMITER");
      numberBlock.setFieldValue((index + 1).toString(), "NUM");
      const [frame] = eventToFrameFactory(
        createTestEvent(numberBlock.id),
      ).frames;
      expect(frame.explanation).toBe(`Variable "text_test" stores "${value}".`);
      expect(frame.variables["text_test"].value).toBe(value);
    }

    // Position beyond array length -> empty
    parse.setFieldValue("*", "DELIMITER");
    numberBlock.setFieldValue("7", "NUM");
    const [state4] = eventToFrameFactory(
      createTestEvent(numberBlock.id),
    ).frames;
    expect(state4.explanation).toBe('Variable "text_test" stores "".');
    expect(state4.variables["text_test"].value).toBe("");
  });
});
