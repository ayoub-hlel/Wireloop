import Blockly from "blockly";
import { COLOR_THEME } from "../../core/blockly/constants/colors";
import type { BlocklyBlockDef } from "../../types/blockly";

[
  { type: "number", blockName: "number", variable_type: "Number" },
  { type: "string", blockName: "string", variable_type: "String" },
  { type: "boolean", blockName: "boolean", variable_type: "Boolean" },
  { type: "color", blockName: "colour", variable_type: "Colour" },
].forEach(({ type, blockName, variable_type }) => {
  const humanType = type === "string" ? "text" : type;

  Blockly.Blocks[`variables_get_${blockName}`] = {
    init: function () {
      const fieldVar = new Blockly.FieldVariable(
        null,
        undefined,
        [variable_type],
        variable_type
      );
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fieldVar as any).createNewVariable = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fieldVar as any).showOnlyVariableAssigned = false;
      this.appendDummyInput()
        // .appendField(`= ${humanType} variable`)
        .appendField(fieldVar, "VAR");
      this.setOutput(true, variable_type);
      this.setColour(COLOR_THEME.DATA);
      this.setTooltip("");
      this.setHelpUrl("");
      this.setCommentText(
        `This block gets the value that the variable is storing.  This variable store a ${humanType}.`
      );

      this.getIcon("comment")?.setBubbleSize(new Blockly.utils.Size(460, 80));
    },
  };

  Blockly.Blocks[`variables_set_${blockName}`] = {
    init: function () {
      const fieldVar = new Blockly.FieldVariable(
        null,
        undefined,
        [variable_type],
        variable_type
      );
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fieldVar as any).createNewVariable = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fieldVar as any).showOnlyVariableAssigned = false;
      this.appendValueInput("VALUE")
        .setCheck(variable_type)
        .appendField(`${humanType}`)
        .appendField(fieldVar, "VAR")
        .appendField(" = ");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(COLOR_THEME.DATA);
      this.setTooltip("");
      this.setHelpUrl("");
      this.setCommentText(
        `This block sets the value the variable is storing.  This variable will store ${humanType} only.`
      );

      this.getIcon("comment")?.setBubbleSize(new Blockly.utils.Size(460, 90));
    },
  };
});
