/**
 * Logic block regression (control_if / controls_ifelse / logic_compare /
 * logic_negate / logic_operation) — rewritten against the shared harness.
 * Every assertion from the four original bespoke files is preserved.
 */
import { describe, it, beforeEach, afterEach, expect } from "vitest";
import type { Workspace, BlockSvg } from "blockly";

import {
  createArduinoAndWorkSpace,
  createSetVariableBlockWithValue,
  createValueBlock,
  createTestEvent,
} from "../../app/tests.helper";
import { VariableTypes } from "@/core/blockly/dto/variable.type";
import { connectToArduinoBlock } from "@/core/blockly/helpers/block.helper";
import { eventToFrameFactory } from "@/core/frames/event-to-frame.factory";
import { stack } from "../_harness/block.harness";

type CompareRow = {
  A: string | number | boolean;
  B: string | number | boolean;
  OP: string;
  type: VariableTypes;
  expectValue: boolean;
};

const valueInput = (
  type: VariableTypes,
  value: string | number | boolean,
) => {
  switch (type) {
    case VariableTypes.STRING:
      return { str: value as string };
    case VariableTypes.NUMBER:
      return { num: value as number };
    case VariableTypes.BOOLEAN:
      return { bool: value as boolean };
    default:
      throw new Error("unsupported compare type " + type);
  }
};

/** Builds a bool_test variable whose value comes from whatever is wired in. */
const setupBoolTestVariable = (workspace: Workspace) => {
  const boolTest = createSetVariableBlockWithValue(
    workspace,
    "bool_test",
    VariableTypes.BOOLEAN,
    true,
  );
  // Detach the seeded literal so the variable's value is driven by the
  // block under test each round.
  boolTest.getInput("VALUE")!.connection!.targetBlock()!.dispose(true);
  connectToArduinoBlock(boolTest);
  return boolTest;
};

describe("logic blocks", () => {
  let ws: Workspace;
  let arduinoBlock: BlockSvg;

  afterEach(() => {
    ws.dispose();
  });

  describe("control_if / controls_ifelse", () => {
    beforeEach(() => {
      [ws, arduinoBlock] = createArduinoAndWorkSpace();
      arduinoBlock.setFieldValue("1", "LOOP_TIMES");
    });

    const wireBranchBlocks = (workspace: Workspace, doInput: string) => {
      const debugBlock1 = workspace.newBlock("debug_block");
      const debugBlock2 = workspace.newBlock("debug_block");
      return { debugBlock1, debugBlock2, attach: (parent: BlockSvg) => {
        parent.getInput(doInput)!.connection!.connect(
          debugBlock1.previousConnection!,
        );
        debugBlock1.nextConnection!.connect(debugBlock2.previousConnection!);
      } };
    };

    it("executes DO only while the condition evaluates truthy", () => {
      const booleanBlock = createValueBlock(ws, VariableTypes.BOOLEAN, true);
      const { attach } = wireBranchBlocks(ws, "DO0");
      const ifBlock = ws.newBlock("control_if") as BlockSvg;
      ifBlock.getInput("IF0")!.connection!.connect(booleanBlock.outputConnection!);
      attach(ifBlock);
      connectToArduinoBlock(ifBlock);

      const [state1, state2, state3] =
        eventToFrameFactory(createTestEvent(ifBlock.id)).frames;
      expect(state1.explanation).toBe(
        'Executing blocks inside "DO" because what is connected is true.',
      );
      expect(state2).toBeDefined();
      expect(state3).toBeDefined();

      ["FALSE", "delete"].forEach((action) => {
        if (action === "delete") {
          booleanBlock.dispose(true);
        } else {
          booleanBlock.setFieldValue(action, "BOOL");
        }

        const states = eventToFrameFactory(createTestEvent(ifBlock.id)).frames;
        expect(states.length).toBe(1);
        const [state1] = states;
        expect(state1.explanation).toBe(
          'Not executing blocks inside "DO" because what is connected is false.',
        );
      });
    });

    it("controls_ifelse executes ELSE when the condition is falsy", () => {
      const booleanBlock = createValueBlock(ws, VariableTypes.BOOLEAN, true);
      const { debugBlock1, attach } = wireBranchBlocks(ws, "ELSE");
      const ifBlock = ws.newBlock("controls_ifelse") as BlockSvg;
      ifBlock.getInput("IF0")!.connection!.connect(booleanBlock.outputConnection!);
      attach(ifBlock);
      connectToArduinoBlock(ifBlock);

      const states = eventToFrameFactory(createTestEvent(ifBlock.id)).frames;
      expect(states.length).toBe(1);
      expect(states[0].explanation).toBe(
        'Executing blocks inside "DO" because what is connected is true.',
      );

      ["FALSE", "delete"].forEach((action) => {
        if (action === "delete") {
          booleanBlock.dispose(true);
        } else {
          booleanBlock.setFieldValue(action, "BOOL");
        }

        // Event triggered from inside the ELSE branch this time.
        const states = eventToFrameFactory(createTestEvent(debugBlock1.id))
          .frames;
        expect(states.length).toBe(3);
        const [state1] = states;
        expect(state1.explanation).toBe(
          'Executing blocks inside "ELSE" because what is connected is false.',
        );
      });
    });
  });

  describe("logic_compare", () => {
    beforeEach(() => {
      [ws] = createArduinoAndWorkSpace();
    });

    it("compares strings, numbers and booleans per operator", () => {
      const boolTest = setupBoolTestVariable(ws);

      const rows: CompareRow[] = [
        { A: "blue", B: "blue", OP: "EQ", type: VariableTypes.STRING, expectValue: true },
        { A: "moo", B: "blue", OP: "EQ", type: VariableTypes.STRING, expectValue: false },
        { A: "blue", B: "red", OP: "NEQ", type: VariableTypes.STRING, expectValue: true },
        { A: "blue", B: "blue", OP: "NEQ", type: VariableTypes.STRING, expectValue: false },
        { A: 3, B: 4, OP: "LT", type: VariableTypes.NUMBER, expectValue: true },
        { A: 3, B: 4, OP: "LTE", type: VariableTypes.NUMBER, expectValue: true },
        { A: 4, B: 4, OP: "LTE", type: VariableTypes.NUMBER, expectValue: true },
        { A: 4, B: 4, OP: "GTE", type: VariableTypes.NUMBER, expectValue: true },
        { A: 4, B: 4, OP: "GT", type: VariableTypes.NUMBER, expectValue: false },
        { A: 6, B: 4, OP: "GT", type: VariableTypes.NUMBER, expectValue: true },
        // added coverage: boolean operands route through the same comparison
        { A: true, B: false, OP: "NEQ", type: VariableTypes.BOOLEAN, expectValue: true },
      ];

      rows.forEach(({ A, B, OP, type, expectValue }) => {
        const [testBlock] = stack(
          ws,
          [
            {
              type: "logic_compare",
              fields: { OP },
              values: { A: valueInput(type, A), B: valueInput(type, B) },
            },
          ],
          arduinoBlock,
        );
        boolTest.getInput("VALUE")!.connection!.connect(testBlock.outputConnection!);
        const [state1] =
          eventToFrameFactory(createTestEvent(testBlock.id)).frames;
        expect(state1.variables["bool_test"].value).toBe(expectValue);
      });
    });

    it("returns false when either compare input is missing", () => {
      const boolTest = setupBoolTestVariable(ws);

      const logicCompareBlock = ws.newBlock("logic_compare") as BlockSvg;
      boolTest
        .getInput("VALUE")!
        .connection!.connect(logicCompareBlock.outputConnection!);
      const [state1] =
        eventToFrameFactory(createTestEvent(logicCompareBlock.id)).frames;
      expect(state1.variables["bool_test"].value).toBe(false);
    });
  });

  describe("logic_negate", () => {
    beforeEach(() => {
      [ws] = createArduinoAndWorkSpace();
    });

    it("flips true->false, false->true, and treats a missing input as true", () => {
      const boolTest = createSetVariableBlockWithValue(
        ws,
        "bool_test",
        VariableTypes.BOOLEAN,
        true,
      );
      const notBlock = ws.newBlock("logic_negate");
      boolTest.getInput("VALUE")!.connection!.connect(notBlock.outputConnection!);
      connectToArduinoBlock(boolTest);

      // testing true turns to false
      const [event1state1] =
        eventToFrameFactory(createTestEvent(boolTest.id)).frames;
      expect(event1state1.variables["bool_test"].value).toBeFalsy();

      // testing false turns to true
      boolTest
        .getInput("VALUE")!
        .connection!.targetBlock()!
        .getInput("BOOL")!
        .connection!.targetBlock()!
        .setFieldValue("FALSE", "BOOL");

      const [event2state1] =
        eventToFrameFactory(createTestEvent(boolTest.id)).frames;
      expect(event2state1.variables["bool_test"].value).toBeTruthy();

      // no boolean connected -> NOT(undefined) is truthy
      boolTest
        .getInput("VALUE")!
        .connection!.targetBlock()!
        .getInput("BOOL")!
        .connection!.targetBlock()!
        .dispose(true);
      const [event3state1] =
        eventToFrameFactory(createTestEvent(boolTest.id)).frames;
      expect(event3state1.variables["bool_test"].value).toBeTruthy();
    });
  });

  describe("logic_operation", () => {
    beforeEach(() => {
      [ws] = createArduinoAndWorkSpace();
    });

    it("evaluates AND/OR truth tables", () => {
      const boolTest = setupBoolTestVariable(ws);

      const rows = [
        { A: true, B: true, OP: "OR", expectValue: true },
        { A: true, B: false, OP: "OR", expectValue: true },
        { A: false, B: false, OP: "OR", expectValue: false },
        { A: true, B: true, OP: "AND", expectValue: true },
        { A: true, B: false, OP: "AND", expectValue: false },
      ];

      rows.forEach(({ A, B, OP, expectValue }) => {
        const [testBlock] = stack(
          ws,
          [
            {
              type: "logic_operation",
              fields: { OP },
              values: { A: { bool: A }, B: { bool: B } },
            },
          ],
          arduinoBlock,
        );
        boolTest.getInput("VALUE")!.connection!.connect(testBlock.outputConnection!);
        const [state1] =
          eventToFrameFactory(createTestEvent(testBlock.id)).frames;
        expect(state1.variables["bool_test"].value).toBe(expectValue);
      });
    });

    it("returns false when either operand input is missing", () => {
      const boolTest = setupBoolTestVariable(ws);

      const logicOperatorBlock = ws.newBlock("logic_operation") as BlockSvg;
      boolTest
        .getInput("VALUE")!
        .connection!.connect(logicOperatorBlock.outputConnection!);
      const [state1] =
        eventToFrameFactory(createTestEvent(logicOperatorBlock.id)).frames;
      expect(state1.variables["bool_test"].value).toBe(false);
    });
  });
});
