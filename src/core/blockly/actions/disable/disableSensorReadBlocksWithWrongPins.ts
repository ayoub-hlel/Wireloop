import type { BlockEvent } from "../../dto/event.type";
import {
  blocksThatRequireSetup,
  BlockType,
  multipleTopBlocks,
} from "../../dto/block.type";
import { ActionType, type DisableBlock } from "../actions";
import union from "lodash/union";
import intersection from "lodash/intersection";
import type { ARDUINO_PINS } from "../../../microcontroller/selectBoard";

/**
 * Disable Sensor Read blocks that do not have the right pin selected.
 * This happens when the user changes the setup bin on a button or analog read setup block but has not changed it on the is_button_pressed block.  So there is a mismatch for the pins.
 */
export const disableSensorReadBlocksWithWrongPins = (
  event: BlockEvent
): DisableBlock[] => {
  const { blocks } = event;
  const sensorReadBlocks = blocks
    .filter((b) => b.type === BlockType.SENSOR_READ)
    .filter((b) =>
      // must allow for multiple setup blocks
      multipleTopBlocks.includes(blocksThatRequireSetup[b.blockName])
    )
    .filter((b) => {
      const setupBlockName = blocksThatRequireSetup[b.blockName];
      // The setup block must exist
      return blocks.find((bl) => bl.blockName == setupBlockName) !== undefined;
    });

  const setupBlockNames = sensorReadBlocks.map(
    (b) => blocksThatRequireSetup[b.blockName]
  );

  const setupBlocks = blocks.filter((b) =>
    setupBlockNames.includes(b.blockName)
  );

  return sensorReadBlocks
    .filter((block) => {
      const availablePins = setupBlocks
        .filter((b) => blocksThatRequireSetup[block.blockName] === b.blockName)
        .reduce<ARDUINO_PINS[]>((prev: ARDUINO_PINS[], next) => union(prev, next.pins as ARDUINO_PINS[]), []);
      return intersection(block.pins as ARDUINO_PINS[], availablePins).length === 0;
    })
    .map((block) => {
      return {
        blockId: block.id,
        type: ActionType.DISABLE_BLOCK,
        warningText: "Please change the pin number to match the setup block",
        stopCompiling: true,
      };
    });
};
