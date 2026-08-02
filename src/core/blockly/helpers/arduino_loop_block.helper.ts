import { getBlockByType } from './block.helper';

/**
 * Shows the number of times to go through the arduino loop block
 */
export const arduinoLoopBlockShowNumberOfTimesThroughLoop = () => {
  const block = getBlockByType('arduino_loop');
  if (!block) return;
  block.inputList[0].setVisible(false);
  block.inputList[1].setVisible(true);
  block.render();
};

/**
 * Shows the forever text in the arduino loop block
 */
export const arduinoLoopBlockShowLoopForeverText = () => {
  const block = getBlockByType('arduino_loop');
  // Guard for boot before the workspace/blocks exist (WL-014). Matches the
  // sibling arduinoLoopBlockShowNumberOfTimesThroughLoop guard.
  if (!block) return;

  block.inputList[0].setVisible(true);
  block.inputList[1].setVisible(false);
  block.render();
};

export const getTimesThroughLoop = (): number => {
  // This is for when the blocks are not loaded and we need this to construct the blocks
  const block = getBlockByType("arduino_loop");
  if (!block) {
    return 3;
  }
  return +block.getFieldValue("LOOP_TIMES");
};

export const isArduinoLoopBlockId = (id: string) => {
  const block = getBlockByType('arduino_loop');
  return block ? block.id === id : false;
}
