/**
 * delay_block regression: explicit DELAY input drives the frame delay in ms;
 * with no input it falls back to the default 1 second.
 */
import { describe, it, beforeEach, afterEach, expect } from "vitest";

import "@/core/blockly/blocks";
import type { Workspace, BlockSvg } from "blockly";
import Blockly from "blockly";
import {
  createArduinoAndWorkSpace,
  createValueBlock,
} from "../../app/tests.helper";
import {
  connectToArduinoBlock,
  getAllBlocks,
} from "@/core/blockly/helpers/block.helper";
import { VariableTypes } from "@/core/blockly/dto/variable.type";
import type { BlockEvent } from "@/core/blockly/dto/event.type";
import { transformBlock } from "@/core/blockly/transformers/block.transformer";
import { getAllVariables } from "@/core/blockly/helpers/variable.helper";
import { transformVariable } from "@/core/blockly/transformers/variables.transformer";
import { eventToFrameFactory } from "@/core/frames/event-to-frame.factory";
import { framesFor } from "../_harness/block.harness";
import { MicroControllerType } from "@/core/microcontroller/microcontroller";

describe("delay block state factories", () => {
  let workspace: Workspace;
  let arduinoBlock: BlockSvg;

  afterEach(() => {
    workspace.dispose();
  });

  beforeEach(() => {
    [workspace, arduinoBlock] = createArduinoAndWorkSpace();
  });

  it("delays for the input's seconds and falls back to 1s without input", () => {
    arduinoBlock.setFieldValue("1", "LOOP_TIMES");
    const delayBlock = workspace.newBlock("delay_block") as BlockSvg;
    const numberBlock = createValueBlock(
      workspace,
      VariableTypes.NUMBER,
      3.532342
    );
    delayBlock
      .getInput("DELAY")!.connection!.connect(numberBlock.outputConnection!);
    connectToArduinoBlock(delayBlock);

    const [state] = framesFor(delayBlock);

    expect(state.explanation).toBe("Waiting for 3.53 seconds.");
    expect(state.delay).toBe(3.532342 * 1000);

    // Dispose the DELAY input -> generator default of 1000ms kicks in.
    numberBlock.dispose(true);

    const event2: BlockEvent = {
      blocks: getAllBlocks().map(transformBlock),
      variables: getAllVariables().map(transformVariable),
      type: Blockly.Events.BLOCK_MOVE,
      blockId: delayBlock.id,
      microController: MicroControllerType.ARDUINO_UNO,
    };

    const [event2state1] = eventToFrameFactory(event2).frames;

    expect(event2state1.explanation).toBe("Waiting for 1.00 seconds.");
    expect(event2state1.delay).toBe(1000);
  });
});
