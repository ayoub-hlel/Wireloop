/**
 * Debug block regression — data-driven specs (see ../_harness).
 * Every assertion from the original bespoke test preserved.
 */
import { describe, it, beforeEach, afterEach, expect } from "vitest";
import type { Workspace, BlockSvg } from "blockly";

import "@/core/blockly/blocks";
import {
  createArduinoAndWorkSpace,
  createSetVariableBlockWithValue,
  createTestEvent,
} from "../../app/tests.helper";
import { connectToArduinoBlock } from "@/core/blockly/helpers/block.helper";
import { VariableTypes } from "@/core/blockly/dto/variable.type";
import { eventToFrameFactory } from "@/core/frames/event-to-frame.factory";

describe("debug block", () => {
  let workspace: Workspace;

  afterEach(() => {
    workspace.dispose();
  });

  beforeEach(() => {
    [workspace] = createArduinoAndWorkSpace();
  });

  it("creates a debug frame carrying all variables and components", () => {
    const debugBlock = workspace.newBlock("debug_block") as BlockSvg;
    connectToArduinoBlock(debugBlock);
    const numberVarBlock = createSetVariableBlockWithValue(
      workspace,
      "var1",
      VariableTypes.NUMBER,
      33,
    );
    connectToArduinoBlock(numberVarBlock);

    const [state1, state2] = eventToFrameFactory(
      createTestEvent(numberVarBlock.id),
    ).frames;

    expect(state2.blockId).toBe(debugBlock.id);
    expect(state2.explanation).toBe("Debug [will pause in Arduino Code.]");
    expect(state1.variables["var1"].value).toBe(33);
  });
});
