import { ArduinoComponentState, ArduinoComponentType } from "./arduino.frame";
import isFunction from "lodash/isFunction";
import { lcdStateId } from "../../blocks/lcd_screen/component-state-to-id";
import { neoPixelId } from "../../blocks/neopixels/component-state-to-id";
import { fastLEDId } from "../../blocks/fastled/component-state-to-id";
import { getLedColorId } from "../../blocks/rgbled/component-state-to-id";
import { writePinId } from "../../blocks/writepin/component-state-to-id";
import { getDigitalSensorId } from "../../blocks/digitalsensor/component-state-to-id";
import { getAnalogSensorId } from "../../blocks/analogsensor/component-state-to-id";
import { getLedId } from "../../blocks/led/component-state-to-id";
import { getMotorShieldId } from "../../blocks/motors/component-state-to-id";
import { getButtonId } from "../../blocks/button/component-state-to-id";

export interface ComponentStateToId {
  (state: ArduinoComponentState): string;
}

const genericSingleComponentId = (state: ArduinoComponentState) => {
  return state.type + "_" + state.pins.sort().join("-");
};

const componentStateFuncs: { [key: string]: ComponentStateToId } = {
  [ArduinoComponentType.BLUE_TOOTH]: genericSingleComponentId,
  [ArduinoComponentType.BUTTON]: getButtonId as unknown as ComponentStateToId,
  [ArduinoComponentType.IR_REMOTE]: genericSingleComponentId,
  [ArduinoComponentType.LED_MATRIX]: genericSingleComponentId,
  [ArduinoComponentType.MOTOR]: getMotorShieldId as unknown as ComponentStateToId,
  [ArduinoComponentType.MESSAGE]: () => ArduinoComponentType.MESSAGE.toString(),
  [ArduinoComponentType.NEO_PIXEL_STRIP]: neoPixelId as unknown as ComponentStateToId,
  [ArduinoComponentType.FASTLED_STRIP]: fastLEDId as unknown as ComponentStateToId,
  [ArduinoComponentType.RFID]: genericSingleComponentId,
  [ArduinoComponentType.SERVO]: genericSingleComponentId,
  [ArduinoComponentType.TEMPERATURE_SENSOR]: genericSingleComponentId,
  [ArduinoComponentType.ULTRASONICE_SENSOR]: genericSingleComponentId,
  [ArduinoComponentType.LCD_SCREEN]: lcdStateId as unknown as ComponentStateToId,
  [ArduinoComponentType.LED_COLOR]: getLedColorId as unknown as ComponentStateToId,
  [ArduinoComponentType.LED]: getLedId as unknown as ComponentStateToId,
  [ArduinoComponentType.WRITE_PIN]: writePinId as unknown as ComponentStateToId,
  [ArduinoComponentType.DIGITAL_SENSOR]: getDigitalSensorId as unknown as ComponentStateToId,
  [ArduinoComponentType.ANALOG_SENSOR]: getAnalogSensorId as unknown as ComponentStateToId,
  [ArduinoComponentType.THERMISTOR]: genericSingleComponentId,
  [ArduinoComponentType.PASSIVE_BUZZER]: genericSingleComponentId,
  [ArduinoComponentType.STEPPER_MOTOR]: genericSingleComponentId,
  [ArduinoComponentType.DIGITAL_DISPLAY]: genericSingleComponentId,
  [ArduinoComponentType.JOYSTICK]: genericSingleComponentId,
  [ArduinoComponentType.TIME]: genericSingleComponentId,
};

export const arduinoComponentStateToId = (
  state: ArduinoComponentState
): string => {
  if (isFunction(componentStateFuncs[state.type])) {
    return componentStateFuncs[state.type](state);
  }

  throw new Error("No Id generator found for state type " + state.type);
};
