import { getWorkspace } from "./workspace.helper";
import type { BlockSvg } from "blockly";

// Guard every workspace read: Blockly.getMainWorkspace() is undefined before
// the workspace is created (studio boot), and these helpers run during boot
// (WL-014). Return empty values instead of throwing so callers can no-op.
export const getAllBlocks = () => {
  const workspace = getWorkspace();
  return workspace ? (workspace.getAllBlocks(true) as BlockSvg[]) : [];
};

/**
 * Gets first block with name of the block
 */
export const getBlockByType = (type: string) => {
  return getAllBlocks().find((block) => block.type === type) as BlockSvg;
};

export const getBlocksByName = (name: string) => {
  return getAllBlocks().filter((block) => block.type === name) as BlockSvg[];
};

export const getBlockById = (id: string) => {
  const workspace = getWorkspace();
  return workspace ? (workspace.getBlockById(id) as BlockSvg) : undefined;
};

export const getTopBlocks = () => {
  const workspace = getWorkspace();
  return workspace ? (workspace.getTopBlocks(true) as BlockSvg[]) : [];
};

export const connectToArduinoBlock = function (variableBlock: BlockSvg) {
  const arduinoBlock =
    getBlockByType("arduino_setup") || getBlockByType("arduino_loop"); // See if
  const inputToAttachVariableTo =
    arduinoBlock.type == "arduino_setup" ? "setup" : "loop";

  const parentConnection = arduinoBlock.getInput(inputToAttachVariableTo)!
    .connection!;
  parentConnection.connect(variableBlock.previousConnection!);
};

export const createBlock = (
  name: string,
  x: number,
  y: number,
  deletable = false
) => {
  const block = getWorkspace().newBlock(name) as BlockSvg;
  block.setDeletable(deletable);
  block.initSvg();
  block.render();
  block.moveBy(x, y);

  return block;
};
