/**
 * Math block regression — data-driven specs (see ../_harness).
 * Merged from six bespoke files; every original assertion preserved.
 * These blocks produce variable updates rather than component states,
 * so assertions target frame.explanation / frame.variables.
 */
import { describe, it, beforeEach, afterEach, expect } from "vitest";
import type { Workspace, BlockSvg } from "blockly";

import {
  createArduinoAndWorkSpace,
  createSetVariableBlockWithValue,
  createValueBlock,
  createTestEvent,
} from "../../app/tests.helper";
import "@/core/blockly/blocks";
import { VariableTypes } from "@/core/blockly/dto/variable.type";
import { connectToArduinoBlock } from "@/core/blockly/helpers/block.helper";
import { eventToFrameFactory } from "@/core/frames/event-to-frame.factory";

// -- local builders (variable plumbing is too nested for the declarative stack)

/** Creates a numeric variable + a bare variables_set_number bound to it. */
const newSetNumber = (ws: Workspace, name: string): BlockSvg => {
  const vm = ws.createVariable(name, "Number");
  const block = ws.newBlock("variables_set_number") as BlockSvg;
  block.setFieldValue(vm.getId(), "VAR");
  return block;
};

/** variables_get_number pointing at the variable a set-block targets. */
const getNumber = (ws: Workspace, setBlock: BlockSvg): BlockSvg => {
  const block = ws.newBlock("variables_get_number") as BlockSvg;
  block.setFieldValue(setBlock.getFieldValue("VAR"), "VAR");
  return block;
};

const numberBlock = (ws: Workspace, value: number | string): BlockSvg =>
  createValueBlock(ws, VariableTypes.NUMBER, value);

const runFrames = (blockId: string) => eventToFrameFactory(createTestEvent(blockId)).frames;

describe("math blocks", () => {
  let workspace: Workspace;
  let arduinoBlock: BlockSvg;

  afterEach(() => {
    workspace.dispose();
  });

  beforeEach(() => {
    [workspace, arduinoBlock] = createArduinoAndWorkSpace();
    arduinoBlock.setFieldValue("1", "LOOP_TIMES");
  });

  // -----------------------------------------------------------------------
  describe("math_arithmetic", () => {
    const OPS = [
      { OP: "ADD", value: 32 },
      { OP: "MINUS", value: 28 },
      { OP: "MULTIPLY", value: 60 },
      { OP: "DIVIDE", value: 15 },
    ];

    // Regression lock on the POWER branch.
    // Note: blocktovalue.ts also has a default-case `return 1` fallback for
    // unknown operators, but it is unreachable through the real block —
    // Blockly dropdown fields reject invalid options, so no test exercises it.
    it("raises A to B via POWER", () => {
      const setNumberBlock = newSetNumber(workspace, "num_test");
      const mathOperatorBlock = workspace.newBlock("math_arithmetic") as BlockSvg;
      mathOperatorBlock.getInput("A")!.connection!.connect(numberBlock(workspace, 2).outputConnection!);
      mathOperatorBlock.getInput("B")!.connection!.connect(numberBlock(workspace, 10).outputConnection!);
      setNumberBlock.getInput("VALUE")!.connection!.connect(mathOperatorBlock.outputConnection!);
      connectToArduinoBlock(setNumberBlock);

      mathOperatorBlock.setFieldValue("POWER", "OP");
      const [state] = runFrames(mathOperatorBlock.id);
      expect(state.variables["num_test"].value).toBe(1024);
    });

    it("computes two math_number inputs into a variable", () => {
      const setNumberBlock = newSetNumber(workspace, "num_test");
      const mathOperatorBlock = workspace.newBlock("math_arithmetic") as BlockSvg;
      mathOperatorBlock.getInput("A")!.connection!.connect(numberBlock(workspace, 30).outputConnection!);
      mathOperatorBlock.getInput("B")!.connection!.connect(numberBlock(workspace, 2).outputConnection!);
      setNumberBlock.getInput("VALUE")!.connection!.connect(mathOperatorBlock.outputConnection!);
      connectToArduinoBlock(setNumberBlock);

      for (const { OP, value } of OPS) {
        mathOperatorBlock.setFieldValue(OP, "OP");
        const [state] = runFrames(mathOperatorBlock.id);
        expect(state.explanation).toBe(`Variable "num_test" stores ${value}.`);
        expect(state.variables["num_test"].value).toBe(value);
        expect(Object.keys(state.variables).length).toBe(1);
      }
    });

    it("computes two variables together", () => {
      const setA = createSetVariableBlockWithValue(workspace, "num_varA", VariableTypes.NUMBER, 30);
      const setB = createSetVariableBlockWithValue(workspace, "num_varB", VariableTypes.NUMBER, 2);
      const setResult = newSetNumber(workspace, "num_test");

      const mathOperatorBlock = workspace.newBlock("math_arithmetic") as BlockSvg;
      mathOperatorBlock.getInput("A")!.connection!.connect(getNumber(workspace, setA).outputConnection!);
      mathOperatorBlock.getInput("B")!.connection!.connect(getNumber(workspace, setB).outputConnection!);
      setResult.getInput("VALUE")!.connection!.connect(mathOperatorBlock.outputConnection!);

      connectToArduinoBlock(setResult);
      connectToArduinoBlock(setB);
      connectToArduinoBlock(setA);

      for (const { OP, value } of OPS) {
        mathOperatorBlock.setFieldValue(OP, "OP");
        const [state1, state2, state3] = runFrames(setResult.id);
        expect(state3.explanation).toBe(`Variable "num_test" stores ${value}.`);
        expect(state3.variables["num_test"].value).toBe(value);
        expect(Object.keys(state1.variables).length).toBe(1);
        expect(Object.keys(state2.variables).length).toBe(2);
        expect(Object.keys(state3.variables).length).toBe(3);
      }
    });

    it("stores 0 when neither A nor B is connected", () => {
      const setNumberBlock = newSetNumber(workspace, "num_test");
      const mathOperatorBlock = workspace.newBlock("math_arithmetic") as BlockSvg;
      setNumberBlock.getInput("VALUE")!.connection!.connect(mathOperatorBlock.outputConnection!);
      connectToArduinoBlock(setNumberBlock);

      for (const OP of ["ADD", "MINUS", "MULTIPLY"]) {
        mathOperatorBlock.setFieldValue(OP, "OP");
        const [state] = runFrames(setNumberBlock.id);
        expect(state.explanation).toBe(`Variable "num_test" stores 0.`);
        expect(state.variables["num_test"].value).toBe(0);
      }
    });
  });

  // -----------------------------------------------------------------------
  describe("math_modulo", () => {
    it("modulos two math_number inputs", () => {
      const setNumberBlock = newSetNumber(workspace, "num_test");
      const modulusBlock = workspace.newBlock("math_modulo") as BlockSvg;
      modulusBlock.getInput("DIVIDEND")!.connection!.connect(numberBlock(workspace, 30).outputConnection!);
      modulusBlock.getInput("DIVISOR")!.connection!.connect(numberBlock(workspace, 4).outputConnection!);
      setNumberBlock.getInput("VALUE")!.connection!.connect(modulusBlock.outputConnection!);
      connectToArduinoBlock(setNumberBlock);

      const [state] = runFrames(modulusBlock.id);
      expect(state.explanation).toBe(`Variable "num_test" stores 2.`);
      expect(state.variables["num_test"].value).toBe(2);
      expect(Object.keys(state.variables).length).toBe(1);
    });

    it("modulos two variables together", () => {
      const dividendBlock = createSetVariableBlockWithValue(workspace, "dividend", VariableTypes.NUMBER, 30);
      const divisorBlock = createSetVariableBlockWithValue(workspace, "divisor", VariableTypes.NUMBER, 2);
      const setNumberBlock = newSetNumber(workspace, "num_test");

      const modulusBlock = workspace.newBlock("math_modulo") as BlockSvg;
      modulusBlock.getInput("DIVIDEND")!.connection!.connect(getNumber(workspace, dividendBlock).outputConnection!);
      modulusBlock.getInput("DIVISOR")!.connection!.connect(getNumber(workspace, divisorBlock).outputConnection!);
      setNumberBlock.getInput("VALUE")!.connection!.connect(modulusBlock.outputConnection!);

      connectToArduinoBlock(setNumberBlock);
      connectToArduinoBlock(dividendBlock);
      connectToArduinoBlock(divisorBlock);

      const [state1, state2, state3] = runFrames(setNumberBlock.id);
      expect(state3.variables["num_test"].value).toBe(0);
      expect(Object.keys(state1.variables).length).toBe(1);
      expect(Object.keys(state2.variables).length).toBe(2);
      expect(Object.keys(state3.variables).length).toBe(3);
    });

    it("stores 0 when nothing is connected", () => {
      const setNumberBlock = newSetNumber(workspace, "num_test");
      const modulusBlock = workspace.newBlock("math_modulo") as BlockSvg;
      setNumberBlock.getInput("VALUE")!.connection!.connect(modulusBlock.outputConnection!);
      connectToArduinoBlock(setNumberBlock);

      const [state] = runFrames(setNumberBlock.id);
      expect(state.explanation).toBe(`Variable "num_test" stores 0.`);
      expect(state.variables["num_test"].value).toBe(0);
      expect(Object.keys(state.variables).length).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  describe("math_number_property", () => {
    let setBooleanBlock: BlockSvg;
    let mathPropertyBlock: BlockSvg;
    let numBlock: BlockSvg;

    beforeEach(() => {
      const vm = workspace.createVariable("bool_test", "Boolean");
      setBooleanBlock = workspace.newBlock("variables_set_boolean") as BlockSvg;
      setBooleanBlock.setFieldValue(vm.getId(), "VAR");
      mathPropertyBlock = workspace.newBlock("math_number_property") as BlockSvg;
      numBlock = numberBlock(workspace, 0);
      mathPropertyBlock.getInput("NUMBER_TO_CHECK")!.connection!.connect(numBlock.outputConnection!);
      setBooleanBlock.getInput("VALUE")!.connection!.connect(mathPropertyBlock.outputConnection!);
      connectToArduinoBlock(setBooleanBlock);
    });

    it("checks even/odd/positive/negative", () => {
      for (const { OP, num, value } of [
        { OP: "EVEN", num: 3, value: false },
        { OP: "EVEN", num: 4, value: true },
        { OP: "ODD", num: 3, value: true },
        { OP: "ODD", num: 4, value: false },
        { OP: "POSITIVE", num: 3, value: true },
        { OP: "POSITIVE", num: -4, value: false },
        { OP: "NEGATIVE", num: -3, value: true },
        { OP: "NEGATIVE", num: 4, value: false },
      ]) {
        numBlock.setFieldValue(String(num), "NUM");
        mathPropertyBlock.setFieldValue(OP, "PROPERTY");
        const [state] = runFrames(mathPropertyBlock.id);
        expect(state.explanation).toBe(`Variable "bool_test" stores ${value}.`);
        expect(state.variables["bool_test"].value).toBe(value);
        expect(Object.keys(state.variables).length).toBe(1);
      }
    });

    it("checks divisibility against a divisor input", () => {
      mathPropertyBlock.setFieldValue("DIVISIBLE_BY", "PROPERTY");
      const numDivisorBlock = numberBlock(workspace, 1);
      mathPropertyBlock.getInput("DIVISOR")!.connection!.connect(numDivisorBlock.outputConnection!);

      for (const { DIVIDEND, DIVISOR, canDivide } of [
        { DIVIDEND: 20, DIVISOR: 3, canDivide: false },
        { DIVIDEND: 44, DIVISOR: 11, canDivide: true },
      ]) {
        numBlock.setFieldValue(String(DIVIDEND), "NUM");
        numDivisorBlock.setFieldValue(String(DIVISOR), "NUM");
        const [state] = runFrames(mathPropertyBlock.id);
        expect(state.explanation).toBe(`Variable "bool_test" stores ${canDivide}.`);
        expect(state.variables["bool_test"].value).toBe(canDivide);
        expect(Object.keys(state.variables).length).toBe(1);
      }
    });

    it("throws on an unsupported property option", () => {
      mathPropertyBlock.setFieldValue("PRIME", "PROPERTY");
      expect(() => eventToFrameFactory(createTestEvent(mathPropertyBlock.id))).toThrowError();
    });
  });

  // -----------------------------------------------------------------------
  describe("math_random_int", () => {
    it("generates numbers within the FROM..TO range", () => {
      const setNumberBlock = newSetNumber(workspace, "num_test");
      const mathRandomBlock = workspace.newBlock("math_random_int") as BlockSvg;
      mathRandomBlock.getInput("FROM")!.connection!.connect(numberBlock(workspace, -30).outputConnection!);
      mathRandomBlock.getInput("TO")!.connection!.connect(numberBlock(workspace, 2).outputConnection!);
      setNumberBlock.getInput("VALUE")!.connection!.connect(mathRandomBlock.outputConnection!);
      connectToArduinoBlock(setNumberBlock);

      const [state] = runFrames(setNumberBlock.id);
      expect(state.explanation).toContain(`Variable "num_test" stores `);
      const value = state.variables["num_test"].value as number;
      expect(-30 <= value).toBeTruthy();
      expect(2 >= value).toBeTruthy();
      expect(Object.keys(state.variables).length).toBe(1);
    });

    it("falls back to 1 with no bounds connected", () => {
      const setNumberBlock = newSetNumber(workspace, "num_test");
      const mathRandomBlock = workspace.newBlock("math_random_int") as BlockSvg;
      setNumberBlock.getInput("VALUE")!.connection!.connect(mathRandomBlock.outputConnection!);
      connectToArduinoBlock(setNumberBlock);

      const [state] = runFrames(setNumberBlock.id);
      expect(state.explanation).toContain(`Variable "num_test" stores `);
      expect(state.variables["num_test"].value).toBe(1);
      expect(Object.keys(state.variables).length).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  describe("math_round", () => {
    it("rounds a math_number input up/nearest/down", () => {
      const setNumberBlock = newSetNumber(workspace, "num_test");
      const mathRoundBlock = workspace.newBlock("math_round") as BlockSvg;
      mathRoundBlock.getInput("NUM")!.connection!.connect(numberBlock(workspace, "3.7").outputConnection!);
      setNumberBlock.getInput("VALUE")!.connection!.connect(mathRoundBlock.outputConnection!);
      connectToArduinoBlock(setNumberBlock);

      for (const { OP, value } of [
        { OP: "ROUND", value: 4 },
        { OP: "ROUNDUP", value: 4 },
        { OP: "ROUNDDOWN", value: 3 },
      ]) {
        mathRoundBlock.setFieldValue(OP, "OP");
        const [state] = runFrames(setNumberBlock.id);
        expect(state.explanation).toBe(`Variable "num_test" stores ${value}.`);
        expect(state.variables["num_test"].value).toBe(value);
        expect(Object.keys(state.variables).length).toBe(1);
      }
    });

    it("rounds a variable holding 3.4", () => {
      const setSource = createSetVariableBlockWithValue(workspace, "num_varB", VariableTypes.NUMBER, 3.4);
      const setResult = newSetNumber(workspace, "num_test");
      const mathRoundBlock = workspace.newBlock("math_round") as BlockSvg;
      mathRoundBlock.getInput("NUM")!.connection!.connect(getNumber(workspace, setSource).outputConnection!);
      setResult.getInput("VALUE")!.connection!.connect(mathRoundBlock.outputConnection!);
      connectToArduinoBlock(setResult);
      connectToArduinoBlock(setSource);

      for (const { OP, value } of [
        { OP: "ROUND", value: 3 },
        { OP: "ROUNDUP", value: 4 },
        { OP: "ROUNDDOWN", value: 3 },
      ]) {
        mathRoundBlock.setFieldValue(OP, "OP");
        const [state1, state2] = runFrames(setResult.id);
        expect(state2.explanation).toBe(`Variable "num_test" stores ${value}.`);
        expect(state2.variables["num_test"].value).toBe(value);
        expect(Object.keys(state1.variables).length).toBe(1);
        expect(Object.keys(state2.variables).length).toBe(2);
      }
    });

    it("stores 1 when nothing is connected", () => {
      const setNumberBlock = newSetNumber(workspace, "num_test");
      const mathRoundBlock = workspace.newBlock("math_round") as BlockSvg;
      setNumberBlock.getInput("VALUE")!.connection!.connect(mathRoundBlock.outputConnection!);
      connectToArduinoBlock(setNumberBlock);

      for (const OP of ["ROUND", "ROUNDUP", "ROUNDDOWN"]) {
        mathRoundBlock.setFieldValue(OP, "OP");
        const [state] = runFrames(setNumberBlock.id);
        expect(state.explanation).toBe(`Variable "num_test" stores 1.`);
        expect(state.variables["num_test"].value).toBe(1);
      }
    });
  });

  // -----------------------------------------------------------------------
  describe("string_to_number", () => {
    it("parses a string variable into a number variable", () => {
      const stringVariableBlock = createSetVariableBlockWithValue(
        workspace,
        "num_string",
        VariableTypes.STRING,
        3.432,
      );
      const getVariableTextBlock = workspace.newBlock("variables_get_string") as BlockSvg;
      getVariableTextBlock.setFieldValue(stringVariableBlock.getFieldValue("VAR"), "VAR");

      const stringToNumberBlock = workspace.newBlock("string_to_number") as BlockSvg;
      stringToNumberBlock.getInput("VALUE")!.connection!.connect(getVariableTextBlock.outputConnection!);

      const setNumberBlock = newSetNumber(workspace, "num_test");
      setNumberBlock.getInput("VALUE")!.connection!.connect(stringToNumberBlock.outputConnection!);

      connectToArduinoBlock(setNumberBlock);
      connectToArduinoBlock(stringVariableBlock);

      const [state1, state2] = runFrames(setNumberBlock.id);
      expect(state2.explanation).toContain(`Variable "num_test" stores 3.432.`);
      expect(state2.variables["num_test"].value).toBe(3.432);
      expect(Object.keys(state1.variables).length).toBe(1);
      expect(Object.keys(state2.variables).length).toBe(2);
    });

    it("falls back to 1 with nothing connected", () => {
      const stringToNumberBlock = workspace.newBlock("string_to_number") as BlockSvg;
      const setNumberBlock = newSetNumber(workspace, "num_test");
      setNumberBlock.getInput("VALUE")!.connection!.connect(stringToNumberBlock.outputConnection!);
      connectToArduinoBlock(setNumberBlock);

      const [state] = runFrames(setNumberBlock.id);
      expect(state.explanation).toContain(`Variable "num_test" stores 1.`);
      expect(state.variables["num_test"].value).toBe(1);
    });
  });
});
