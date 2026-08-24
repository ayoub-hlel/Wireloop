/**
 * LCD screen block regression — harness-style rewrite.
 * Every assertion from the original bespoke suite is preserved verbatim;
 * the ritual (setup block, print-block wiring, frame indexing) is collapsed
 * into local builders. Chained statements / repeat loops still use raw
 * Blockly wiring because the declarative stack helper doesn't model them.
 */
import { describe, it, beforeEach, afterEach, expect } from "vitest";

import "@/core/blockly/blocks";
import { Workspace, BlockSvg } from "blockly";
import { connectToArduinoBlock } from "@/core/blockly/helpers/block.helper";
import { eventToFrameFactory } from "@/core/frames/event-to-frame.factory";
import { ARDUINO_PINS } from "@/core/microcontroller/selectBoard";
import {
  ArduinoFrame,
  ArduinoComponentType,
} from "@/core/frames/arduino.frame";
import { LCDScreenState, LCD_SCREEN_MEMORY_TYPE } from "@/blocks/lcd_screen/state";
import {
  createArduinoAndWorkSpace,
  createValueBlock,
  createTestEvent,
} from "../../app/tests.helper";
import { VariableTypes } from "@/core/blockly/dto/variable.type";
import { findComponent } from "@/core/frames/transformer/frame-transformer.helpers";

describe("lcd factories", () => {
  let workspace: Workspace;
  let lcdsetup: BlockSvg;
  let arduinoBlock: BlockSvg;

  afterEach(() => {
    workspace.dispose();
  });

  beforeEach(() => {
    [workspace, arduinoBlock] = createArduinoAndWorkSpace();
    lcdsetup = workspace.newBlock("lcd_setup") as BlockSvg;

    lcdsetup.setFieldValue("0x27", "MEMORY_TYPE");
    lcdsetup.setFieldValue("20 x 4", "SIZE");
  });

  /** Builds an lcd_screen_print block with text/row/column value inputs wired. */
  const makePrint = (
    text: string | BlockSvg,
    row: number,
    column: number
  ): BlockSvg => {
    const print = workspace.newBlock("lcd_screen_print") as BlockSvg;
    // NOTE: no `instanceof BlockSvg` here — vitest resolves two blockly module
    // instances, so instanceof is false for legit blocks. Duck-type instead.
    const textBlock = typeof text === "string" ? strValue(text) : text;
    print
      .getInput("PRINT")!.connection!.connect(textBlock.outputConnection!);
    print.getInput("ROW")!.connection!.connect(
      numValue(row).outputConnection!
    );
    print.getInput("COLUMN")!.connection!.connect(
      numValue(column).outputConnection!
    );
    return print;
  };

  /** Builds an lcd_blink block with row/column inputs and a BLINK field. */
  const makeBlink = (
    blinkField: string,
    row: number,
    column: number
  ): BlockSvg => {
    const blink = workspace.newBlock("lcd_blink") as BlockSvg;
    blink.setFieldValue(blinkField, "BLINK");
    blink.getInput("ROW")!.connection!.connect(
      numValue(row).outputConnection!
    );
    blink.getInput("COLUMN")!.connection!.connect(
      numValue(column).outputConnection!
    );
    return blink;
  };

  const strValue = (value: string): BlockSvg =>
    createValueBlock(workspace, VariableTypes.STRING, value);
  const numValue = (value: number): BlockSvg =>
    createValueBlock(workspace, VariableTypes.NUMBER, value);

  /** Fires the factory off the setup block (the production trigger path). */
  const runFrames = (): ArduinoFrame[] =>
    eventToFrameFactory(createTestEvent(lcdsetup.id)).frames;

  const lcdOf = (frame: ArduinoFrame): LCDScreenState =>
    findComponent<LCDScreenState>(frame, ArduinoComponentType.LCD_SCREEN)!;

  const confirmScrollMove = (
    actualState: ArduinoFrame,
    blockId: string,
    row1Text: string,
    explanationText: string
  ) => {
    expect(lcdOf(actualState).rowsOfText[0]).toBe(row1Text);
    expect(actualState.blockId).toBe(blockId);
    expect(actualState.explanation).toBe(explanationText);
  };

  it("should be able generate state for lcd setup block", () => {
    const event = createTestEvent(lcdsetup.id);

    const lcdState: LCDScreenState = {
      pins: [ARDUINO_PINS.PIN_A4, ARDUINO_PINS.PIN_A5],
      backLightOn: true,
      blink: { row: 0, column: 0, blinking: false },
      memoryType: LCD_SCREEN_MEMORY_TYPE["0X27"],
      rowsOfText: [
        "                    ",
        "                    ",
        "                    ",
        "                    ",
      ],
      rows: 4,
      columns: 20,
      type: ArduinoComponentType.LCD_SCREEN,
      sdaPin: ARDUINO_PINS.PIN_A4,
      sclPin: ARDUINO_PINS.PIN_A5,
    };

    const state: ArduinoFrame = {
      blockId: lcdsetup.id,
      blockName: "lcd_setup",
      timeLine: { function: "pre-setup", iteration: 0 },
      explanation: "Setting up LCD Screen.",
      components: [lcdState],
      variables: {},
      txLedOn: false,
      builtInLedOn: false,
      sendMessage: "", // message arduino is sending
      delay: 0, // Number of milliseconds to delay
      powerLedOn: true,
      frameNumber: 1,
    };

    expect(eventToFrameFactory(event).frames).toEqual([state]);
  });

  it("locks the other dropdown branches: 0x3F memory + 16x2 size", () => {
    lcdsetup.setFieldValue("0x3F", "MEMORY_TYPE");
    lcdsetup.setFieldValue("16 x 2", "SIZE");

    const frames = runFrames();
    const lcdState = lcdOf(frames[0]);
    expect(lcdState.memoryType).toBe(LCD_SCREEN_MEMORY_TYPE.OX3F);
    expect(lcdState.rows).toBe(2);
    expect(lcdState.columns).toBe(16);
    // Source quirk locked as-is: rowsOfText is hard-coded to four 20-char
    // blanks in lcdScreenSetup regardless of SIZE. If you fix that, update
    // this assertion deliberately.
    expect(lcdState.rowsOfText).toEqual([
      "                    ",
      "                    ",
      "                    ",
      "                    ",
    ]);
  });

  it("LCD Screen simple print should print something simple", () => {
    arduinoBlock.setFieldValue("1", "LOOP_TIMES");
    const lcdPrintLCDBlock = workspace.newBlock(
      "lcd_screen_simple_print"
    ) as BlockSvg;

    const textRowBlock1 = strValue("HELLO");

    const textRowBlock2 = strValue("WORLDWORLDWORLDWORLD12345");

    const numBlock = numValue(3);
    lcdPrintLCDBlock
      .getInput("ROW_1")!.connection!.connect(textRowBlock1.outputConnection!);
    lcdPrintLCDBlock
      .getInput("ROW_2")!.connection!.connect(textRowBlock2.outputConnection!);

    lcdPrintLCDBlock
      .getInput("DELAY")!.connection!.connect(numBlock.outputConnection!);

    connectToArduinoBlock(lcdPrintLCDBlock);

    const [, state2, state3] = runFrames();
    const lcdState = lcdOf(state2);
    expect(state2.explanation).toBe("Printing message for 3.00 seconds.");
    expect(state2.delay).toBe(3000);
    expect(lcdState.rowsOfText[0]).toBe("HELLO               "); // ADDS THE SPACE
    expect(lcdState.rowsOfText[1]).toBe("WORLDWORLDWORLDWORLD"); // CUTS OFF THE 12345
    expect(lcdState.rowsOfText[2]).toBe("                    ");
    expect(lcdState.rowsOfText[3]).toBe("                    ");

    const lcdState2 = lcdOf(state3);

    expect(state3.explanation).toBe("Clearing the screen.");
    expect(state3.delay).toBe(0);
    expect(lcdState2.rowsOfText[0]).toBe("                    ");
    expect(lcdState2.rowsOfText[1]).toBe("                    ");
    expect(lcdState2.rowsOfText[2]).toBe("                    ");
    expect(lcdState2.rowsOfText[3]).toBe("                    ");
  });

  it("should be able to move test to right and then to left", () => {
    arduinoBlock.setFieldValue("1", "LOOP_TIMES");
    const printBlock = makePrint(strValue("HELLO   WORLD!!!"), 1, 1);

    /** Builds a repeat_ext loop with an lcd_scroll inside its DO input. */
    const scrollRepeat = (dir: "RIGHT" | "LEFT"): BlockSvg => {
      const loop = workspace.newBlock("controls_repeat_ext") as BlockSvg;
      const scroll = workspace.newBlock("lcd_scroll") as BlockSvg;
      scroll.setFieldValue(dir, "DIR");
      loop.getInput("DO")!.connection!.connect(scroll.previousConnection!);
      loop
        .getInput("TIMES")!.connection!.connect(numValue(4).outputConnection!);
      return scroll;
    };

    const lcdScrollRightBlock = scrollRepeat("RIGHT");
    const lcdScrollLeftBlock = scrollRepeat("LEFT");

    connectToArduinoBlock(printBlock);
    printBlock.nextConnection!.connect(
      lcdScrollRightBlock.getSurroundParent()!.previousConnection!
    );
    // Chain the two repeat loops sequentially after the print statement.
    lcdScrollRightBlock.getSurroundParent()!.nextConnection!.connect(
      lcdScrollLeftBlock.getSurroundParent()!.previousConnection!
    );

    const [
      ,
      printBlockState,
      ,
      moveRight1State,
      ,
      moveRight2State,
      ,
      moveRight3State,
      ,
      moveRight4State,
      ,
      moveLeft1State,
      ,
      moveLeft2State,
      ,
      moveLeft3State,
      ,
      moveLeft4State,
    ] = runFrames();

    confirmScrollMove(
      printBlockState,
      printBlock.id,
      "HELLO   WORLD!!!    ",
      'Printing "HELLO   WORLD!!!" to the screen at position (1, 1).'
    );

    confirmScrollMove(
      moveRight1State,
      lcdScrollRightBlock.id,
      " HELLO   WORLD!!!   ",
      "Scrolling text to the right."
    );

    confirmScrollMove(
      moveRight2State,
      lcdScrollRightBlock.id,
      "  HELLO   WORLD!!!  ",
      "Scrolling text to the right."
    );

    confirmScrollMove(
      moveRight3State,
      lcdScrollRightBlock.id,
      "   HELLO   WORLD!!! ",
      "Scrolling text to the right."
    );

    confirmScrollMove(
      moveRight4State,
      lcdScrollRightBlock.id,
      "    HELLO   WORLD!!!",
      "Scrolling text to the right."
    );

    confirmScrollMove(
      moveLeft1State,
      lcdScrollLeftBlock.id,
      "   HELLO   WORLD!!! ",
      "Scrolling text to the left."
    );

    confirmScrollMove(
      moveLeft2State,
      lcdScrollLeftBlock.id,
      "  HELLO   WORLD!!!  ",
      "Scrolling text to the left."
    );

    confirmScrollMove(
      moveLeft3State,
      lcdScrollLeftBlock.id,
      " HELLO   WORLD!!!   ",
      "Scrolling text to the left."
    );

    confirmScrollMove(
      moveLeft4State,
      lcdScrollLeftBlock.id,
      "HELLO   WORLD!!!    ",
      "Scrolling text to the left."
    );
  });

  it("test print block an row and column over flow gets cut off.", () => {
    const printBlock = makePrint("THIS IS GOOFY", 5, 20);

    connectToArduinoBlock(printBlock);

    const [, state2] = runFrames();

    expect(state2.explanation).toBe(
      'Printing "THIS IS GOOFY" to the screen at position (20, 4).'
    );
    const lcdState = lcdOf(state2);
    expect(lcdState.rowsOfText[3]).toBe("                   T");
  });

  it("should be able to write over text with the print block", () => {
    const printBlock1 = makePrint("Score: 10", 2, 2);
    const printBlock2 = makePrint("Score: 20", 2, 2);

    connectToArduinoBlock(printBlock2);
    connectToArduinoBlock(printBlock1);

    const [, state2, state3] = runFrames();

    expect(state2.explanation).toBe(
      'Printing "Score: 10" to the screen at position (2, 2).'
    );
    const lcdState1 = lcdOf(state2);

    expect(lcdState1.rowsOfText[1]).toBe(" Score: 10          ");

    expect(state2.explanation).toBe(
      'Printing "Score: 10" to the screen at position (2, 2).'
    );
    const lcdState2 = lcdOf(state3);

    expect(lcdState2.rowsOfText[1]).toBe(" Score: 20          ");

    expect(state3.explanation).toBe(
      'Printing "Score: 20" to the screen at position (2, 2).'
    );
  });

  const confirmBlinkAndExplanation = (
    actualState: ArduinoFrame,
    blockId: string,
    isBlinking: boolean,
    blinkRow: number,
    blinkCol: number,
    explanationText: string
  ) => {
    expect(actualState.blockId).toBe(blockId);
    expect(actualState.explanation).toBe(explanationText);
    const lcdState = lcdOf(actualState);
    expect(lcdState.blink.blinking).toBe(isBlinking);
    expect(lcdState.blink.row).toBe(blinkRow);
    expect(lcdState.blink.column).toBe(blinkCol);
  };

  it("should be able to make the lcd blink and save the state", () => {
    const turnOnBlink = makeBlink("BLINK", 2, 20);

    const printBlock1 = makePrint("What is your name?", 2, 2);

    const turnoffBlink = makeBlink("OFF", 2, 20);

    connectToArduinoBlock(turnOnBlink);
    turnOnBlink.nextConnection!.connect(printBlock1.previousConnection!);
    printBlock1.nextConnection!.connect(turnoffBlink.previousConnection!);

    const [, state2, state3, state4] = runFrames();
    confirmBlinkAndExplanation(
      state2,
      turnOnBlink.id,
      true,
      2,
      20,
      "Turning on blinking at (20, 2)."
    );

    confirmBlinkAndExplanation(
      state3,
      printBlock1.id,
      true,
      2,
      20,
      'Printing "What is your name?" to the screen at position (2, 2).'
    );

    confirmBlinkAndExplanation(
      state4,
      turnoffBlink.id,
      false,
      0,
      0,
      "Turning off blinking."
    );
  });

  it("should be able to clear everything off a screen", () => {
    const printBlock1 = makePrint("What is your name?", 2, 2);

    const clearBlock = workspace.newBlock("lcd_screen_clear");

    printBlock1.nextConnection!.connect(clearBlock.previousConnection!);

    connectToArduinoBlock(printBlock1);

    const [, state2, state3] = runFrames();
    const lcdState2 = lcdOf(state2);

    expect(lcdState2.rowsOfText[1]).toBe(" What is your name? ");

    const lcdState3 = lcdOf(state2);

    expect(lcdState3.rowsOfText[0]).toBe("                    ");
    expect(state3.explanation).toBe("Clearing the screen.");
  });

  it("should be able to turn the back light on and off", () => {
    const backLightOn = workspace.newBlock("lcd_backlight") as BlockSvg;
    const backLightOff = workspace.newBlock("lcd_backlight");

    backLightOn.setFieldValue("ON", "BACKLIGHT");
    backLightOff.setFieldValue("OFF", "BACKLIGHT");
    connectToArduinoBlock(backLightOn);
    backLightOn.nextConnection!.connect(backLightOff.previousConnection!);

    const [, state2, state3] = runFrames();

    expect(state2.explanation).toBe("Turning on backlight.");
    const lcdState1 = lcdOf(state2);
    expect(lcdState1.backLightOn).toBeTruthy();

    expect(state3.explanation).toBe("Turning off backlight.");
    const lcdState2 = lcdOf(state3);
    expect(lcdState2.backLightOn).toBeFalsy();
  });
});
