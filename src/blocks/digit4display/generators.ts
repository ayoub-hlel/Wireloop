import Blockly, { type Block } from "blockly";

Blockly["Arduino"]["digital_display_setup"] = function (block: Block) {
  const dioPin = block.getFieldValue("DIO_PIN");
  const clkPin = block.getFieldValue("CLK_PIN");

  Blockly["Arduino"].libraries_["define_digital_display"] = `
#include "SevenSegmentTM1637.h"  // Includes the library for the TM1637 7-segment display
const byte PIN_CLK = ${dioPin};   // Defines CLK pin for the display
const byte PIN_DIO = ${clkPin};   // Defines DIO pin for the display
// Initializes the 7-segment display with CLK and DIO pins
SevenSegmentTM1637    digitalDisplay(PIN_CLK, PIN_DIO);
`;

  Blockly["Arduino"].setupCode_[
    "digital_display_setup"
  ] = `   digitalDisplay.begin(); // Starts the 7-segment display
   digitalDisplay.setBacklight(100);  // Sets the display backlight to maximum brightness
`;

  const code = "";
  return code;
};

Blockly["Arduino"]["digital_display_set"] = function (block: Block) {
  const text = Blockly["Arduino"].valueToCode(
    block,
    "TEXT",
    Blockly["Arduino"].ORDER_ATOMIC
  );
  const colonOn = block.getFieldValue("COLON") == "TRUE";

  // This has to 4 in order to get the colons to work

  const code = `
  digitalDisplay.clear();
  digitalDisplay.setColonOn(${colonOn});
  digitalDisplay.print(${text});
`;
  return code;
};
