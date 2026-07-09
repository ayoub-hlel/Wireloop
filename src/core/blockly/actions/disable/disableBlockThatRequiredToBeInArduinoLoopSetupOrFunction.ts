import type { BlockEvent } from "../../dto/event.type";
import { type DisableBlock, ActionType } from "../actions";
import { BlockTypeRequireRootBlock } from "../../dto/block.type";

/**
 * Disables Blocks that are required to be in loop, setup, or prodecure function.
 */
export const disableBlockThatRequiredToBeInArduinoLoopSetupOrFunction = (
  event: BlockEvent
): DisableBlock[] => {
  const { blocks } = event;
  return blocks
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((block) => BlockTypeRequireRootBlock.includes(block.type as any))
    .filter(
      (block) =>
        block.rootBlockId === undefined ||
        BlockTypeRequireRootBlock.includes(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
          blocks.find((b) => b.id === block.rootBlockId)!.type as any
        )
    )
    .map((block) => {
      return {
        blockId: block.id,
        type: ActionType.DISABLE_BLOCK,
        warningText: '',
        stopCompiling: false,
      };
    });
};
