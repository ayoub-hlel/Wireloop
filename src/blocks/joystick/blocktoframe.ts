import { findFieldValue } from "../../core/blockly/helpers/block-data.helper";
import { ArduinoComponentType } from "../../core/frames/arduino.frame";
import { BlockToFrameTransformer } from "../../core/frames/transformer/block-to-frame.transformer";
import { arduinoFrameByComponent } from "../../core/frames/transformer/frame-transformer.helpers";
import { ARDUINO_PINS } from "../../core/microcontroller/selectBoard";
import { JoyStickSensor, JoystickState } from "./state";

export const joystickSetup: BlockToFrameTransformer = (
  blocks,
  block,
  variables,
  timeline,
  previousState
) => {
  const xPin = findFieldValue(block, "PIN_X") as ARDUINO_PINS;
  const yPin = findFieldValue(block, "PIN_Y") as ARDUINO_PINS;
  const buttonPin = findFieldValue(block, "PIN_BUTTON") as ARDUINO_PINS;

  let sensorData: JoyStickSensor[];
  try {
    sensorData = block.metaData ? JSON.parse(block.metaData) : [];
  } catch {
    sensorData = [];
  }

  const loop1 = sensorData.find((s) => s.loop === 1);
  const buttonPressed = loop1?.buttonPressed ?? false;
  const engaged = loop1?.engaged ?? false;
  const degree = loop1?.degree ?? 0;

  const joystickState: JoystickState = {
    type: ArduinoComponentType.JOYSTICK,
    pins: [xPin, yPin, buttonPin],
    buttonPin,
    xPin,
    yPin,
    buttonPressed,
    engaged,
    degree,
  };

  return [
    arduinoFrameByComponent(
      block.id,
      block.blockName,
      timeline,
      joystickState,
      "Setting up joystick.",
      previousState
    ),
  ];
};
