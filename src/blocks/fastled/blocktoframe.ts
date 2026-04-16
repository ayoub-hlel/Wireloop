import { findFieldValue } from "../../core/blockly/helpers/block-data.helper";
import { ArduinoComponentType } from "../../core/frames/arduino.frame";
import type { BlockToFrameTransformer } from "../../core/frames/transformer/block-to-frame.transformer";
import { getInputValue } from "../../core/frames/transformer/block-to-value.factories";
import {
  arduinoFrameByComponent,
  findComponent,
  getDefaultIndexValue,
} from "../../core/frames/transformer/frame-transformer.helpers";
import type { FastLEDState } from "./state";
import cloneDeep from "lodash/cloneDeep";
import { hexToRgb } from "../../core/blockly/helpers/color.helper";

export const fastLEDSetup: BlockToFrameTransformer = (
  blocks,
  block,
  variables,
  timeline,
  previousState
) => {
  const numberOfLeds = +findFieldValue(block, "NUMBER_LEDS");

  const ledStripState: FastLEDState = {
    pins: block.pins,
    type: ArduinoComponentType.FASTLED_STRIP,
    numberOfLeds,
    preShowLEDs: Array.from({ length: numberOfLeds }, (_, i) => ({
      position: i,
      color: {
        red: 0,
        green: 0,
        blue: 0,
      },
    })),
    fastLEDs: Array.from({ length: numberOfLeds }, (_, i) => ({
      position: i,
      color: {
        red: 0,
        green: 0,
        blue: 0,
      },
    })),
  };
  return [
    arduinoFrameByComponent(
      block.id,
      block.blockName,
      timeline,
      ledStripState,
      "Setting up led light strip.",
      previousState
    ),
  ];
};

export const showAllColors: BlockToFrameTransformer = (
  blocks,
  block,
  variables,
  timeline,
  previousState
) => {
  const fastLED = findComponent<FastLEDState>(
    previousState,
    ArduinoComponentType.FASTLED_STRIP
  );
  if (!fastLED) return [];
  const preShowLeds = Array.from({ length: fastLED.numberOfLeds }, (_, i) => ({
    position: i,
    color: {
      red: 0,
      green: 0,
      blue: 0,
    },
  }));
  const newFastLeds = fastLED.preShowLEDs;
  fastLED.fastLEDs = cloneDeep(newFastLeds);
  const newComponent = cloneDeep(fastLED);

  return [
    arduinoFrameByComponent(
      block.id,
      block.blockName,
      timeline,
      newComponent,
      `Displaying all the rgb leds on the light strip.`,
      previousState
    ),
  ];
};

export const setAllColors: BlockToFrameTransformer = (
  blocks,
  block,
  variables,
  timeline,
  previousState
) => {
  const fastLED = findComponent<FastLEDState>(
    previousState,
    ArduinoComponentType.FASTLED_STRIP
  );
  if (!fastLED) return [];

  const leds = [];
  for (let position = 1; position <= fastLED.numberOfLeds; position += 1) {
    const hexValue = findFieldValue(block, getRowColId(position));
    const color = hexToRgb(hexValue);
    leds.push({ position: position - 1, color });
  }
  fastLED.preShowLEDs = leds;
  const newComponent = cloneDeep(fastLED);

  return [
    arduinoFrameByComponent(
      block.id,
      block.blockName,
      timeline,
      newComponent,
      `Setting all the colors in the rgb led strip.`,
      previousState
    ),
  ];
};

const getRowColId = (position: number): string => {
  const row = Math.ceil(position / 12);

  return `${row}-${position - (row - 1) * 12}`;
};

export const setFastLEDColor: BlockToFrameTransformer = (
  blocks,
  block,
  variables,
  timeline,
  previousState
) => {
  const fastLED = findComponent<FastLEDState>(
    previousState,
    ArduinoComponentType.FASTLED_STRIP
  );
  if (!fastLED) return [];
  const color = getInputValue(
    blocks,
    block,
    variables,
    timeline,
    "COLOR",
    { red: 0, green: 0, blue: 0 },
    previousState
  );
  const position = getDefaultIndexValue(
    1,
    Infinity,
    getInputValue(
      blocks,
      block,
      variables,
      timeline,
      "POSITION",
      1,
      previousState
    )
  );
  fastLED.preShowLEDs[position - 1] = { position: position - 1, color };
  const newComponent = cloneDeep(fastLED);

  return [
    arduinoFrameByComponent(
      block.id,
      block.blockName,
      timeline,
      newComponent,
      `Setting LED ${position} on light strip to color (red=${color.red},green=${color.green},blue=${color.blue})`,
      previousState
    ),
  ];
};
