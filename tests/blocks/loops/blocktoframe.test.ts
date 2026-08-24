/**
 * Loop block regression (controls_repeat_ext + controls_for) — rewritten
 * against the shared harness (see _harness). Statement-stack wiring (DO input)
 * uses the raw Blockly primitives because the declarative stack() helper only
 * wires value inputs. Every assertion from the original bespoke tests is kept.
 */
import { describe, it, beforeEach, afterEach, expect } from "vitest";

import "@/core/blockly/blocks";
import type { Workspace, BlockSvg } from "blockly";
import {
  createArduinoAndWorkSpace,
  createValueBlock,
  createTestEvent,
} from "../../app/tests.helper";
import { VariableTypes } from "@/core/blockly/dto/variable.type";
import { connectToArduinoBlock } from "@/core/blockly/helpers/block.helper";
import { eventToFrameFactory } from "@/core/frames/event-to-frame.factory";

describe("controls_repeat_ext", () => {
  let ws: Workspace;
  let arduinoBlock: BlockSvg;

  beforeEach(() => {
    [ws, arduinoBlock] = createArduinoAndWorkSpace();
    arduinoBlock.setFieldValue("1", "LOOP_TIMES");
  });
  afterEach(() => {
    ws.dispose();
  });

  it("generates states for the number plugged into TIMES", () => {
    const simpleForLoop = ws.newBlock("controls_repeat_ext") as BlockSvg;
    const numberBlock = createValueBlock(ws, VariableTypes.NUMBER, 3);
    const debugBlock = ws.newBlock("debug_block");
    simpleForLoop
      .getInput("DO")!.connection!.connect(debugBlock.previousConnection!);
    simpleForLoop
      .getInput("TIMES")!.connection!.connect(numberBlock.outputConnection!);

    connectToArduinoBlock(simpleForLoop);

    const states = eventToFrameFactory(createTestEvent(simpleForLoop.id)).frames;
    expect(states.length).toBe(6);
    const [state1, state2, state3, , state5] = states;

    expect(state2.blockId).toBe(debugBlock.id);

    expect(state1.explanation).toBe("Running loop 1 out of 3 times.");
    expect(state1.blockId).toBe(simpleForLoop.id);

    expect(state3.explanation).toBe("Running loop 2 out of 3 times.");
    expect(state3.blockId).toBe(simpleForLoop.id);

    expect(state5.explanation).toBe("Running loop 3 out of 3 times.");
    expect(state5.blockId).toBe(simpleForLoop.id);

    // Testing if no loop times input is present
    numberBlock.dispose(true);

    const states2 = eventToFrameFactory(
      createTestEvent(simpleForLoop.id)
    ).frames;
    expect(states2.length).toBe(2);
    expect(states2[0].explanation).toBe("Running loop 1 out of 1 times.");
    expect(states2[1].blockId).toBe(debugBlock.id);
  });
});

describe("controls_for", () => {
  let ws: Workspace;
  let arduinoBlock: BlockSvg;

  beforeEach(() => {
    [ws, arduinoBlock] = createArduinoAndWorkSpace();
    arduinoBlock.setFieldValue("1", "LOOP_TIMES");
  });
  afterEach(() => {
    ws.dispose();
  });

  it("loops -3 to -10 subtracting by 2 (-3 -5 -7 -9)", () => {
    testloop(ws, -3, -10, 2, [-3, -5, -7, -9]);
  });

  it("loops -3 to 0 subtracting by 1 (-3 -2 -1 0)", () => {
    testloop(ws, -3, 0, 1, [-3, -2, -1, 0]);
  });

  it("loops 1 to 10 adding by 3 (1 4 7 10)", () => {
    testloop(ws, 1, 10, 3, [1, 4, 7, 10]);
  });

  it("loops 1 to 10 adding by 2 (1 3 5 7 9)", () => {
    testloop(ws, 1, 10, 2, [1, 3, 5, 7, 9]);
  });

  it("handles an empty body looping 1 to 10", () => {
    testloop(ws, 1, 10, 1, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("handles empty FROM, TO and BY inputs", () => {
    testloop(ws, null, null, null, [1]);
  });

  it("handles nothing inside the for loop", () => {
    testloop(ws, 1, 10, 1, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], true);
  });
});

const testloop = (
  workspace: Workspace,
  from: number | null = null,
  to: number | null = null,
  by: number | null = null,
  expectedIValuesInOrder: number[] = [],
  nothingInLoop = false
) => {
  const info = generateFrameForLoop(workspace, from, to, by, nothingInLoop);
  const states = info.frames;
  const debugBlock = info.loopBlock.getInput("DO")!.connection!.targetBlock();
  const expectedNumberOfFrames =
    debugBlock && !nothingInLoop
      ? expectedIValuesInOrder.length * 2
      : expectedIValuesInOrder.length;
  expect(states.length).toBe(expectedNumberOfFrames);
  let counter = 0;
  states.forEach((state, index) => {
    if (index % 2 == 1 && debugBlock && !nothingInLoop) {
      expect(state.blockId).toBe(debugBlock.id);
      return;
    }
    if (index % 2 == 1 && !nothingInLoop) {
      return;
    }

    const iValue = expectedIValuesInOrder[counter];
    expect(state.explanation).toBe(
      `Running loop ${counter + 1} out ${
        expectedIValuesInOrder.length
      } times; i = ${iValue}`
    );
    expect(state.variables["i"].value).toBe(iValue);
    counter += 1;
  });
};

const generateFrameForLoop = (
  workspace: Workspace,
  from: number | null = null,
  to: number | null = null,
  by: number | null = null,
  nothingInLoop = false
) => {
  const forLoopNumber = workspace.newBlock("controls_for") as BlockSvg;

  // `!== null` (not truthiness): 0 is a valid FROM/TO/BY value.
  if (from !== null) {
    const fromNumberBlock = createValueBlock(
      workspace,
      VariableTypes.NUMBER,
      from
    );
    forLoopNumber
      .getInput("FROM")!.connection!.connect(fromNumberBlock.outputConnection!);
  }

  if (to !== null) {
    const toNumberBlock = createValueBlock(workspace, VariableTypes.NUMBER, to);
    forLoopNumber
      .getInput("TO")!.connection!.connect(toNumberBlock.outputConnection!);
  }

  if (by !== null) {
    forLoopNumber.setFieldValue(by.toString(), "BY");
  }

  if (!nothingInLoop) {
    const debugBlock = workspace.newBlock("debug_block");
    forLoopNumber
      .getInput("DO")!.connection!.connect(debugBlock.previousConnection!);
  }

  connectToArduinoBlock(forLoopNumber);

  return {
    frames: eventToFrameFactory(createTestEvent(forLoopNumber.id)).frames,
    loopBlock: forLoopNumber,
  };
};
