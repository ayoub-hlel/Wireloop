import { describe, it, beforeEach, afterEach, expect } from "vitest";

import "../blocks";
import _ from "lodash";
import type { BlockEvent } from "../dto/event.type";
import updateLcdScreenPrintBlock from "./updateLcdScreenPrintBlock";
import { type UpdateLCDScreenPrintBlock, ActionType } from "./actions";
import {
  createArduinoAndWorkSpace,
  createTestEvent,
} from "../../../tests/tests.helper";
import { BlockSvg, WorkspaceSvg } from "blockly";

describe("updateLcdScreenPrintBlock", () => {
  let workspace: WorkspaceSvg;
  let arduinoBlock: BlockSvg;

  beforeEach(() => {
    [workspace, arduinoBlock] = createArduinoAndWorkSpace();
  });

  afterEach(() => {
    workspace.dispose();
  });

  it("should return an empty array if lcd_screen_simple_print is not there.", () => {
    const event: BlockEvent = createTestEvent(arduinoBlock.id);

    expect(updateLcdScreenPrintBlock(event)).toEqual([]);
  });

  it("should return 2 rows for if the lcd setup is set to 16 x 2", () => {
    const lcdSetupBlock = workspace.newBlock("lcd_setup");
    const lcdPrintDisplay = workspace.newBlock("lcd_screen_simple_print");
    lcdSetupBlock.setFieldValue("16 x 2", "SIZE");
    const event: BlockEvent = createTestEvent(arduinoBlock.id);
    expect(updateLcdScreenPrintBlock(event)).toEqual([
      {
        blockId: lcdPrintDisplay.id,
        type: ActionType.LCD_SIMPLE_PRINT_CHANGE,
        numberOfRows: 2,
      },
    ]);
  });

  it("should return 4 rows for if the lcd setup is set to 20 x 4 and handle multiple blocks", () => {
    const lcdSetupBlock = workspace.newBlock("lcd_setup");
    const lcdPrintDisplay = workspace.newBlock("lcd_screen_simple_print");
    const lcdPrintDisplay2 = workspace.newBlock("lcd_screen_simple_print");
    lcdSetupBlock.setFieldValue("20 x 4", "SIZE");
    const event: BlockEvent = createTestEvent(arduinoBlock.id);
    expect(updateLcdScreenPrintBlock(event)).toEqual([
      {
        blockId: lcdPrintDisplay.id,
        type: ActionType.LCD_SIMPLE_PRINT_CHANGE,
        numberOfRows: 4,
      },
      {
        blockId: lcdPrintDisplay2.id,
        type: ActionType.LCD_SIMPLE_PRINT_CHANGE,
        numberOfRows: 4,
      },
    ]);
  });
});
