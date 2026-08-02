import type { BlockSvg, VariableModel } from "blockly";
import { transformBlock } from "./block.transformer";
import type { BlockEvent } from "../dto/event.type";
import get from "lodash/get";
import { transformVariable } from "./variables.transformer";
import type { MicroControllerType } from "../../microcontroller/microcontroller";

export const transformEvent = (
  blocks: BlockSvg[],
  variables: VariableModel[],
  event: Record<string, unknown>,
  microcontrollerType: MicroControllerType
): BlockEvent => {
  const blockDatum = blocks.map(transformBlock);
  return {
    blockId: get(event, "blockId", undefined) as string,
    type: event.type as string,
    blocks: blockDatum,
    microController: microcontrollerType,
    variables: variables.map(transformVariable),
    fieldName: get(event, "name", undefined) as string | undefined,
    fieldType: get(event, "element", undefined) as string | undefined,
    newValue: get(event, "newValue", undefined) as string | undefined,
    oldValue: get(event, "oldValue", undefined) as string | undefined,
  };
};
