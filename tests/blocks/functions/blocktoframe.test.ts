/**
 * Function (procedures) block regression — data-driven specs (see ../_harness).
 * Every assertion from the original bespoke test preserved.
 */
import { describe, it, beforeEach, afterEach, expect } from "vitest";
import type { Workspace, BlockSvg } from "blockly";

import "@/core/blockly/blocks";
import { createArduinoAndWorkSpace } from "../../app/tests.helper";
import { connectToArduinoBlock } from "@/core/blockly/helpers/block.helper";
import { eventToFrameFactory } from "@/core/frames/event-to-frame.factory";
import { createTestEvent } from "../../app/tests.helper";

describe("function blocks", () => {
  let workspace: Workspace;
  let arduinoBlock: BlockSvg;

  afterEach(() => {
    workspace.dispose();
  });

  beforeEach(() => {
    [workspace, arduinoBlock] = createArduinoAndWorkSpace();
    arduinoBlock.setFieldValue("1", "LOOP_TIMES");
  });

  it("defines a function and emits a calling frame for its call block", () => {
    const functionBlock = workspace.newBlock("procedures_defnoreturn") as BlockSvg;
    functionBlock.setFieldValue("funcName", "NAME");

    // The debug block lives inside the function body; executing the call
    // must produce one frame for the call itself and one for each body block.
    const debugBlock = workspace.newBlock("debug_block") as BlockSvg;
    functionBlock.getInput("STACK")!.connection!.connect(debugBlock.previousConnection!);

    const funcCallBlock = workspace.newBlock("procedures_callnoreturn") as BlockSvg;
    funcCallBlock.setFieldValue("funcName", "NAME");
    connectToArduinoBlock(funcCallBlock);

    const states = eventToFrameFactory(createTestEvent(funcCallBlock.id)).frames;

    expect(states.length).toBe(2);
    const [state1, state2] = states;
    expect(state1.blockId).toBe(funcCallBlock.id);
    expect(state1.explanation).toBe("Calling function funcName.");
    expect(state2.blockId).toBe(debugBlock.id);
  });
});
