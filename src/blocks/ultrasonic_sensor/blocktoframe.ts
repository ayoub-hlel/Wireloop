import { findFieldValue } from "../../core/blockly/helpers/block-data.helper";
import { ArduinoComponentType } from "../../core/frames/arduino.frame";
import type { BlockToFrameTransformer } from "../../core/frames/transformer/block-to-frame.transformer";
import { arduinoFrameByComponent } from "../../core/frames/transformer/frame-transformer.helpers";
import type { UltraSonicSensor, UltraSonicSensorState } from "./state";

export const ultraSonicSensor: BlockToFrameTransformer = (
  blocks,
  block,
  variables,
  timeline,
  previousState
) => {
  let sensorDatum: UltraSonicSensor[] = [];
  try {
    sensorDatum = JSON.parse(block.metaData) as UltraSonicSensor[];
  // eslint-disable-next-line no-empty
  } catch {
  }
  const sensorData = sensorDatum.find((d) => d.loop === 1);

  const ultraSonicState: UltraSonicSensorState = {
    cm: sensorData?.cm ?? 0,
    pins: block.pins.sort(),
    trigPin: findFieldValue(block, "PIN_TRIG"),
    echoPin: findFieldValue(block, "PIN_ECHO"),
    type: ArduinoComponentType.ULTRASONICE_SENSOR,
  };

  return [
    arduinoFrameByComponent(
      block.id,
      block.blockName,
      timeline,
      ultraSonicState,
      "Setting up ultra sonic sensor.",
      previousState
    ),
  ];
};
