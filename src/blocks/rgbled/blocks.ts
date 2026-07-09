import Blockly from "blockly";
import { COLOR_THEME } from "../../core/blockly/constants/colors";
import { selectBoardBlockly } from "../../core/microcontroller/selectBoard";
import type { BlocklyBlockDef } from "../../types/blockly";

const rgbLedSetupBlock: BlocklyBlockDef = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField(new Blockly.FieldImage("./blocks/led/color_led.png", 15, 15))
      .appendField("Setup RGB LED");
    this.appendDummyInput("NUMBER")
      .appendField("Number of RGB Leds")
      .appendField(
        new Blockly.FieldDropdown([
          ["1", "1"],
          ["2", "2"],
        ]) as Blockly.Field,
        "NUMBER_OF_COMPONENTS"
      );
    this.appendDummyInput("COMPONENT_1")
      .appendField("LED 1: ")
      .appendField("Red")
      .appendField(
        new Blockly.FieldDropdown(() => selectBoardBlockly().pwmNonAnalogPins) as Blockly.Field,
        "PIN_RED_1"
      )
      .appendField("Green")
      .appendField(
        new Blockly.FieldDropdown(() => selectBoardBlockly().pwmNonAnalogPins) as Blockly.Field,
        "PIN_GREEN_1"
      )
      .appendField("Blue")
      .appendField(
        new Blockly.FieldDropdown(() => selectBoardBlockly().pwmNonAnalogPins) as Blockly.Field,
        "PIN_BLUE_1"
      );

    this.appendDummyInput("COMPONENT_2")
      .appendField("LED 2: ")
      .appendField("Red")
      .appendField(
        new Blockly.FieldDropdown(() => selectBoardBlockly().pwmNonAnalogPins) as Blockly.Field,
        "PIN_RED_2"
      )
      .appendField("Green")
      .appendField(
        new Blockly.FieldDropdown(() => selectBoardBlockly().pwmNonAnalogPins) as Blockly.Field,
        "PIN_GREEN_2"
      )
      .appendField("Blue")
      .appendField(
        new Blockly.FieldDropdown(() => selectBoardBlockly().pwmNonAnalogPins) as Blockly.Field,
        "PIN_BLUE_2"
      );

    this.setColour(COLOR_THEME.COMPONENTS);
    this.setTooltip("");
    this.setHelpUrl("");
  },
};
Blockly.Blocks["rgb_led_setup"] = rgbLedSetupBlock;
const set_color_led: BlocklyBlockDef = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput("NAME")
      .appendField(new Blockly.FieldImage("./blocks/led/color_led.png", 15, 15))
      .appendField("Set RGB LED's Color ");

    this.appendDummyInput("WHICH_COMPONENT")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("Which Led: ")
      .appendField(
        new Blockly.FieldDropdown([
          ["1", "1"],
          ["2", "2"],
        ]) as Blockly.Field,
        "WHICH_COMPONENT"
      );

    this.appendValueInput("COLOR")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("Set Color: ");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setTooltip("");
    this.setHelpUrl("");
    this.setColour(COLOR_THEME.COMPONENTS);
  },
};

const set_simple_color_led: BlocklyBlockDef = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput("NAME")
      .appendField(new Blockly.FieldImage("./blocks/led/color_led.png", 15, 15))
      .appendField("Simple RGB Led's Color ");

    this.appendDummyInput("WHICH_COMPONENT")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("Which Led: ")
      .appendField(
        new Blockly.FieldDropdown([
          ["1", "1"],
          ["2", "2"],
        ]) as Blockly.Field,
        "WHICH_COMPONENT"
      );
    this.appendDummyInput("COLOR")
      .appendField("Set Color: ")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField(
        new Blockly.FieldColour("red", undefined, {
          colourOptions: ["#ff0000", "#00ff00", "#0000ff", "#000000"],
        }),
        "COLOR"
      );

    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setTooltip("");
    this.setHelpUrl("");
    this.setColour(COLOR_THEME.COMPONENTS);
  },
};
Blockly.common.defineBlocks({
  set_color_led: set_color_led,
  set_simple_color_led: set_simple_color_led,
});
