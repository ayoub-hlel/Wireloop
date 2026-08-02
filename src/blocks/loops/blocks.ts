import Blockly from "blockly";
import { COLOR_THEME } from "../../core/blockly/constants/colors";

const blocks = [
  {
    lastDummyAlign0: "RIGHT",
    type: "controls_for",
    inputsInline: true,
    message0: "loop with %1 from %2 to %3 by adding %4",
    args0: [
      {
        type: "field_variable",
        name: "VAR",
        variable: null,
        variableTypes: ["Number"],
        defaultType: "Number",
        createNewVariable: true,
        showOnlyVariableAssigned: false,
      },
      {
        type: "input_value",
        name: "FROM",
        check: "Number",
        align: "RIGHT",
      },
      {
        type: "input_value",
        name: "TO",
        check: "Number",
        align: "RIGHT",
      },
      {
        type: "field_number",
        name: "BY",
        value: "1",
        min: 1,
        max: 200000,
      },
    ],
    message1: "%{BKY_CONTROLS_REPEAT_INPUT_DO} %1",
    args1: [
      {
        type: "input_statement",
        name: "DO",
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: COLOR_THEME.CONTROL,
    helpUrl: "%{BKY_CONTROLS_FOR_HELPURL}",
    extensions: ["contextMenu_newGetVariableBlock", "controls_for_tooltip"],
  },
];

// The stock `blockly` library ships a built-in `controls_for` block whose BY
// is an input_value. Our custom block replaces it with a Number-typed variable
// block whose BY is a field_number. The stock block registers first (via
// `blockly/browser.js`), so drop it here or the dedup filter below would
// silently discard our definition (WL-004).
delete Blockly.Blocks["controls_for"];
Blockly.defineBlocksWithJsonArray(blocks.filter(b => !Blockly.Blocks[b.type]));
