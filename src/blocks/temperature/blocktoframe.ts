import { ArduinoComponentType } from "../../core/frames/arduino.frame";
import type { BlockToFrameTransformer } from "../../core/frames/transformer/block-to-frame.transformer";
import { arduinoFrameByComponent } from "../../core/frames/transformer/frame-transformer.helpers";
import type { TemperatureState, TempSensor } from "./state";

export const tempSetupSensor: BlockToFrameTransformer = (
  blocks,
  block,
  variables,
  timeline,
  previousState
) => {
  let sensorDatum: TempSensor[] = [];
  try {
    sensorDatum = JSON.parse(block.metaData) as TempSensor[];
  // eslint-disable-next-line no-empty
  } catch {
  }
  const sensorData = sensorDatum.find((d) => d.loop === 1);

  const tempSensorState: TemperatureState = {
    pins: block.pins,
    temperature: sensorData?.temp ?? 0,
    humidity: sensorData?.humidity ?? 0,
    type: ArduinoComponentType.TEMPERATURE_SENSOR,
  };

  return [
    arduinoFrameByComponent(
      block.id,
      block.blockName,
      timeline,
      tempSensorState,
      "Setting up temperature sensor.",
      previousState
    ),
  ];
};
