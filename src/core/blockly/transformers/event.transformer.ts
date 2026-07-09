import type { BlockSvg, VariableModel } from "blockly";
import { transformBlock } from "./block.transformer";
import type { BlockEvent } from "../dto/event.type";
import get from "lodash/get";
import { transformVariable } from "./variables.transformer";
import type { MicroControllerType } from "../../microcontroller/microcontroller";

export const transformEvent = (
  blocks: BlockSvg[],
  variables: VariableModel[],
  event: object | any,
  microcontrollerType: MicroControllerType
): BlockEvent => {
  const blockDatum = blocks.map(transformBlock);
  return {
    blockId: get(event, "blockId", undefined),
    type: event.type,
    blocks: blockDatum,
    microController: microcontrollerType,
    variables: variables.map(transformVariable),
    fieldName: get(event, "name", undefined),
    fieldType: get(event, "element", undefined),
    newValue: get(event, "newValue", undefined),
    oldValue: get(event, "oldValue", undefined),
  };
};
