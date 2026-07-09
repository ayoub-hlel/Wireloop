import { describe, it, beforeEach, expect } from "vitest";

import "../blocks";
import Blockly from "blockly";
import type { Workspace, BlockSvg } from "blockly";
import { connectToArduinoBlock } from "../helpers/block.helper";
import {
  createArduinoAndWorkSpace,
  createTestEvent,
} from "../../../tests/tests.helper";
import { updateFastLedSetAllColorsUpdateBlock } from "./fastLedSetAllColorsUpdateBlock";

describe("fastLedSetAllColorsUpdateBlock", () => {
  let workspace: Workspace;
  let fastLedSetupBlock: BlockSvg;
  let fastledSetAllColorsBlock: BlockSvg;

  beforeEach(() => {
    [workspace] = createArduinoAndWorkSpace();
    fastLedSetupBlock = workspace.newBlock("fastled_setup") as BlockSvg;
    fastledSetAllColorsBlock = workspace.newBlock("fastled_set_all_colors") as BlockSvg;
    connectToArduinoBlock(fastledSetAllColorsBlock);
  });

  it("testing the math", () => {
    testMathScenario(20, 8, 2);
    testMathScenario(30, 6, 3);
    testMathScenario(11, 11, 1);
    testMathScenario(50, 2, 5);
    testMathScenario(144, 12, 12);
  });

  it("should return nothing if there is no setup block", () => {
    fastLedSetupBlock.dispose(true);
    const event = createTestEvent(fastLedSetupBlock.id, Blockly.Events.MOVE);
    expect(updateFastLedSetAllColorsUpdateBlock(event)).toEqual([]);
  });

  it("should return nothing if the block is deleted", () => {
    fastledSetAllColorsBlock.dispose(true);
    const event = createTestEvent(
      fastledSetAllColorsBlock.id,
      Blockly.Events.DELETE
    );
    expect(updateFastLedSetAllColorsUpdateBlock(event)).toEqual([]);
  });

  function testMathScenario(maxLeds: number, maxColumnsOnLastRow: number, maxRows: number) {
    fastLedSetupBlock.setFieldValue(maxLeds, "NUMBER_LEDS");
    const event = createTestEvent(fastLedSetupBlock.id, Blockly.Events.MOVE);
    const [action] = updateFastLedSetAllColorsUpdateBlock(event);
    expect(action.maxLeds).toBe(maxLeds);
    expect(action.maxColumnsOnLastRow).toBe(maxColumnsOnLastRow);
    expect(action.maxRows).toBe(maxRows);
  }
});
