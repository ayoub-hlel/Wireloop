import type { TimeState } from "./state";
import { ArduinoComponentType } from "../../core/frames/arduino.frame";
import type { ValueGenerator } from "../../core/frames/transformer/block-to-value.factories";

export const timeSeconds: ValueGenerator = (
  blocks,
  block,
  variables,
  timeline,
  previousState
) => {
  if (!previousState) return 0;
  const timeState = previousState.components.find(
    (c) => c.type === ArduinoComponentType.TIME
  ) as TimeState;

  return Math.floor(Math.round(timeState.timeInSeconds * 100)) / 100;
};
