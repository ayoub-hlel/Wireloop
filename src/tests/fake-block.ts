import Blockly from "blockly";

// This is prevent the coloring stuff from rendering
// @ts-expect-error - accessing protected members for test mocking
Blockly.FieldColour.prototype.doValueUpdate_ = function (newValue) {
  // @ts-expect-error - accessing protected members
  this.value_ = newValue;
};
