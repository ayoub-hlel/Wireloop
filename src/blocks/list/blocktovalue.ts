import cloneDeep from "lodash/cloneDeep";
import type { BlockData } from "../../core/blockly/dto/block.type";
import type { VariableData } from "../../core/blockly/dto/variable.type";
import { findFieldValue } from "../../core/blockly/helpers/block-data.helper";
import type { ArduinoFrame, Color, Timeline } from "../../core/frames/arduino.frame";
import { getInputValue } from "../../core/frames/transformer/block-to-value.factories";

export const getItemInList = (
  blocks: BlockData[],
  block: BlockData,
  variables: VariableData[],
  timeline: Timeline,
  previousState: ArduinoFrame | undefined
) => {
  const variableFound = variables.find(
    (v) => v.id === findFieldValue(block, "VAR")
  );
  if (!variableFound || !previousState) return undefined;
  const variableName = variableFound.name;

  const currentValue = cloneDeep([
    ...(previousState.variables[variableName].value as
      | string[]
      | Color[]
      | boolean[]
      | number[]),
  ]) as string[] | Color[] | boolean[] | number[];
  let position: number = getInputValue(
    blocks,
    block,
    variables,
    timeline,
    "POSITION",
    1,
    previousState
  );

  position = position >= 1 ? position - 1 : 0;
  position = position < 0 ? 0 : position;
  position =
    position > currentValue.length - 1 ? currentValue.length - 1 : position;

  return currentValue[position];
};
