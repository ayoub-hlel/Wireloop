import Blockly, { type Block } from "blockly";

Blockly["Arduino"]["passive_buzzer_note"] = function (block: Block) {
  const tone = +block.getFieldValue("TONE");
  const pin = block.getFieldValue("PIN");
  Blockly["Arduino"].setupCode_["tone_pin_" + pin] =
    "\tpinMode(" + pin + ", OUTPUT); \n";

  if (tone === 0) {
    return `noTone(${pin});\n`;
  }

  return `tone(${pin}, ${tone});\n`;
};

Blockly["Arduino"]["passive_buzzer_tone"] = function (block: Block) {
  const tone = +Blockly["Arduino"].valueToCode(
    block,
    "TONE",
    Blockly["Arduino"].ORDER_ATOMIC
  );
  const pin = block.getFieldValue("PIN");
  Blockly["Arduino"].setupCode_["tone_pin_" + pin] =
    "\tpinMode(" + pin + ", OUTPUT); \n";

  if (tone === 0) {
    return `noTone(${pin});\n`;
  }

  return `tone(${pin}, ${tone});\n`;
};

Blockly["Arduino"]["passive_buzzer_simple"] =
  Blockly["Arduino"]["passive_buzzer_note"];