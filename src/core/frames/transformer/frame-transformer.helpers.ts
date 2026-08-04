import type {
  ArduinoFrame,
  Timeline,
  ArduinoComponentState,
  Variable,
  Color,
  ArduinoComponentType,
} from "../arduino.frame";

import { arduinoComponentStateToId } from "../arduino-component-id";

import cloneDeep from "lodash/cloneDeep";
import type { BlockData } from "../../blockly/dto/block.type";
import { findBlockById } from "../../blockly/helpers/block-data.helper";
import { VariableTypes } from "../../blockly/dto/variable.type";
import type { ARDUINO_PINS } from "../../microcontroller/selectBoard";

export const arduinoFrameByVariable = (
  blockId: string,
  blockName: string,
  timeline: Timeline,
  newVariable: Variable,
  explanation: string,
  previousFrame: ArduinoFrame | undefined,
  txLedOn = false,
  builtInLedOn = false,
  delay = 0
): ArduinoFrame => {
  const variables = previousFrame ? cloneDeep(previousFrame.variables) : {};
  variables[newVariable.name] = newVariable;
  const components = previousFrame ? cloneDeep(previousFrame.components) : [];

  return {
    blockId,
    blockName,
    sendMessage: "",
    timeLine: { ...timeline },
    variables,
    txLedOn,
    builtInLedOn,
    components,
    explanation,
    delay,
    powerLedOn: true,
    frameNumber: previousFrame ? previousFrame.frameNumber + 1 : 1,
  };
};

export const findBlockInput = (
  blocks: BlockData[],
  block: BlockData,
  inputName: string
) => {
  const input = block.inputBlocks.find((i) => i.name == inputName);
  if (!input || !input.blockId) {
    return undefined;
  }

  return findBlockById(blocks, input.blockId);
};

export const arduinoFrameByExplanation = (
  blockId: string,
  blockName: string,
  timeline: Timeline,
  explanation: string,
  previousFrame: ArduinoFrame | undefined,
  txLedOn = false,
  builtInLedOn = false,
  delay = 0
): ArduinoFrame => {
  const components = previousFrame ? cloneDeep(previousFrame.components) : [];

  const variables = previousFrame ? { ...previousFrame.variables } : {};

  return {
    blockId,
    blockName,
    sendMessage: "",
    timeLine: { ...timeline },
    variables,
    txLedOn,
    builtInLedOn,
    components,
    explanation,
    delay,
    powerLedOn: true,
    frameNumber: previousFrame ? previousFrame.frameNumber + 1 : 1,
  };
};

export const getDefaultIndexValue = (
  min: number,
  max: number,
  index: number
) => {
  if (index < min) {
    return min;
  }

  if (index > max) {
    return max;
  }

  return index;
};

export const arduinoFrameByComponent = (
  blockId: string,
  blockName: string,
  timeline: Timeline,
  newComponent: ArduinoComponentState,
  explanation: string,
  previousFrame: ArduinoFrame | undefined,
  txLedOn = false,
  builtInLedOn = false,
  delay = 0
): ArduinoFrame => {
  const variables = previousFrame ? { ...previousFrame.variables } : {};
  const previousComponents = previousFrame ? [...previousFrame.components] : [];

  const components = [
    ...previousComponents.filter(
      (c) =>
        arduinoComponentStateToId(c) !== arduinoComponentStateToId(newComponent)
    ),
    newComponent,
  ];

  return {
    blockId,
    blockName,
    sendMessage: "",
    timeLine: { ...timeline },
    variables,
    txLedOn,
    builtInLedOn: builtInLedOn,
    components,
    explanation,
    delay,
    powerLedOn: true,
    frameNumber: previousFrame ? previousFrame.frameNumber + 1 : 1,
  };
};

export const getInputBlock = (
  blocks: BlockData[],
  block: BlockData,
  input: string
) => {
  const inputFound = block.inputBlocks.find((i) => i.name == input);
  if (!inputFound) return undefined;
  const blockId = inputFound.blockId;

  return blocks.find((b) => b.id === blockId);
};

export const getDefaultValue = (type: VariableTypes) => {
  switch (type) {
    case VariableTypes.COLOUR:
      return { red: 0, green: 0, blue: 0 };
    case VariableTypes.STRING:
      return "";
    case VariableTypes.BOOLEAN:
      return true;
    case VariableTypes.NUMBER:
      return 0;
    // List variables default to an empty list; the previous fallthrough
    // returned undefined, which is not a valid Variable.value.
    case VariableTypes.LIST_STRING:
      return [] as string[];
    case VariableTypes.LIST_NUMBER:
      return [] as number[];
    case VariableTypes.LIST_BOOLEAN:
      return [] as boolean[];
    case VariableTypes.LIST_COLOUR:
      return [] as Color[];
  }
};

export const getDefaultValueList = (type: VariableTypes) => {
  switch (type) {
    case VariableTypes.COLOUR:
      return { red: 0, green: 0, blue: 0 };
    case VariableTypes.STRING:
      return "";
    case VariableTypes.BOOLEAN:
      return false;
    case VariableTypes.NUMBER:
      return 0;
    // Only scalar types reach this switch at runtime (setItemInList callers
    // pass NUMBER/STRING/BOOLEAN/COLOUR). The list branches are unreachable;
    // `as never` keeps them out of the return union so list-item defaults
    // stay scalar-typed.
    case VariableTypes.LIST_STRING:
    case VariableTypes.LIST_NUMBER:
    case VariableTypes.LIST_BOOLEAN:
    case VariableTypes.LIST_COLOUR:
      return undefined as never;
  }
};

export const valueToString = (
  value:
    | Color
    | string
    | boolean
    | number
    | (string | null)[]
    | (number | null)[]
    | (boolean | null)[]
    | (Color | null)[],
  type: VariableTypes
) => {
  if (type === VariableTypes.COLOUR) {
    // value is the scalar Colour when type is COLOUR; the list-typed members
    // of Variable["value"] have no overlap with Color, hence `unknown`.
    const color = value as unknown as Color;
    return value
      ? `(red=${color.red},green=${color.green},blue=${color.blue})`
      : "(red=0,green=0,blue=0)";
  }

  if (type === VariableTypes.STRING) {
    return `"${value}"`;
  }

  return value;
};

export const findComponent = <T extends ArduinoComponentState>(
  state: ArduinoFrame | undefined,
  type: ArduinoComponentType,
  pin?: ARDUINO_PINS
): T | undefined => {
  if (state === undefined) {
    return undefined;
  }
  if (pin !== undefined) {
    return state.components.find(
      (c) => c.type === type && c.pins.includes(pin)
    ) as T | undefined;
  }

  return state.components.find((c) => c.type === type) as T | undefined;
};
