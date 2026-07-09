import type { Timeline } from "../../frames/arduino.frame";
import type { BlockData } from "../dto/block.type";
import type { Sensor } from "../dto/sensors.type";

export const findSensorState = <S extends Sensor>(
  block: BlockData,
  timeline: Timeline
): S | undefined => {
  let sensorStates: S[];
  try {
    sensorStates = block.metaData ? JSON.parse(block.metaData) : [];
  } catch {
    sensorStates = [];
  }

  return sensorStates.find((s) => {
    return (
      s.loop === timeline.iteration ||
      ((timeline.function === "pre-setup" || timeline.function === "setup") &&
        s.loop === 1)
    );
  });
};
