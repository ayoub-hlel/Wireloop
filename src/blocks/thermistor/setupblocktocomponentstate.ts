import type { BlockData } from "../../core/blockly/dto/block.type";
import { findFieldValue } from "../../core/blockly/helpers/block-data.helper";
import { findSensorState } from "../../core/blockly/helpers/sensor_block.helper";
import {
  ArduinoComponentType,
  Timeline,
} from "../../core/frames/arduino.frame";
import type { ARDUINO_PINS } from "../../core/microcontroller/selectBoard";
import type { ThermistorSensor, ThermistorState } from "./state";

export const thermistorSetupBlockToComponentState = (
  block: BlockData,
  timeline: Timeline
): ThermistorState => {
  const sensorData = findSensorState<ThermistorSensor>(block, timeline);

  const temp = sensorData?.temp ?? 0;

  return {
    type: ArduinoComponentType.THERMISTOR,
    pins: [findFieldValue(block, "PIN") as ARDUINO_PINS],
    temp,
    tempC: temp,
    tempF: (temp * 9) / 5 + 32,
    externalResistorsOhms: +findFieldValue(block, "NONIMAL_RESISTANCE"),
  };
};
