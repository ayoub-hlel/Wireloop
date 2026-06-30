import Blockly from "blockly";

// This is prevent the coloring stuff from rendering
// @ts-ignore - accessing protected members for test mocking
Blockly.FieldColour.prototype.doValueUpdate_ = function (newValue) {
  // @ts-ignore - accessing protected members
  this.value_ = newValue;
};

class FieldColorPicker {
  constructor(color: string) {}
  public doValueUpdate_(newValue: string) {}
}

(Blockly as any).FieldColorPicker = FieldColorPicker;
