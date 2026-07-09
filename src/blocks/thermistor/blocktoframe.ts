import { findFieldValue } from "../../core/blockly/helpers/block-data.helper";
import { ArduinoComponentType } from "../../core/frames/arduino.frame";
import type { BlockToFrameTransformer } from "../../core/frames/transformer/block-to-frame.transformer";
import { arduinoFrameByComponent } from "../../core/frames/transformer/frame-transformer.helpers";
import type { ThermistorSensor, ThermistorState } from "./state";

export const thermistorSetup: BlockToFrameTransformer = (
  blocks,
  block,
  variables,
  timeline,
  previousState
) => {
  let sensorDatum: ThermistorSensor[] = [];
  try {
    sensorDatum = JSON.parse(block.metaData) as ThermistorSensor[];
  // eslint-disable-next-line no-empty
  } catch {
  }
  const sensorData = sensorDatum.find((d) => d.loop === 1);

  const thermistorState: ThermistorState = {
    pins: block.pins,
    type: ArduinoComponentType.THERMISTOR,
    temp: sensorData?.temp ?? 0,
    tempC: sensorData?.temp ?? 0,
    tempF: ((sensorData?.temp ?? 0) * 9) / 5 + 32,
    externalResistorsOhms: +findFieldValue(block, "NONIMAL_RESISTANCE"),
  };

  return [
    arduinoFrameByComponent(
      block.id,
      block.blockName,
      timeline,
      thermistorState,
      "Setting up Thermistor",
      previousState
    ),
  ];
};
