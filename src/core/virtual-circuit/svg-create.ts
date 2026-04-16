import { createComponentEl } from "./svg-helpers";
import type { Element, Svg } from "@svgdotjs/svg.js";
import {
  ArduinoComponentState,
  ArduinoComponentType,
} from "../frames/arduino.frame";
import { addDraggableEvent } from "./component-events.helpers";
import {
  bluetoothPosition,
  createBluetoothWires,
  bluetoothCreate,
} from "../../blocks/bluetooth/virtual-circuit";
import {
  createIrRemote,
  createWiresIrRemote,
  positionIrRemote,
} from "../../blocks/ir_remote/virtual-circuit";
import {
  createWiresLcd,
  lcdCreate,
  lcdPosition,
} from "../../blocks/lcd_screen/virtual-circuit";
import {
  createWiresRgbLed,
  createRgbLed,
  positionRgbLed,
} from "../../blocks/rgbled/virtual-circuit";
import {
  createWiresLedMatrix,
  ledMatrixCreate,
  ledMatrixPosition,
} from "../../blocks/led_matrix/virtual-circuit";

import {
  ledCreate,
  createWiresLed,
  ledPosition,
} from "../../blocks/led/virtual-circuit";

import { arduinoMessageCreate } from "../../blocks/message/virtual-circuit";
import {
  createMotorWires,
  motorCreate,
  motorPosition,
} from "../../blocks/motors/virtual-circuit";
import {
  neoPixelCreate,
  createWiresNeoPixels,
  neoPixelPosition,
} from "../../blocks/neopixels/virtual-circuit";
import {
  fastLEDCreate,
  createWiresFastLEDs,
  fastLEDPosition,
} from "../../blocks/fastled/virtual-circuit";
import {
  digitalAnanlogWritePinCreate,
  createWiresDigitalAnalogWrite,
  digitalAnanlogWritePinPosition,
} from "../../blocks/writepin/virtual-circuit";

import {
  createWiresRfid,
  positionRfid,
  createRfid,
} from "../../blocks/rfid/virtual-circuit";
import {
  servoCreate,
  createWiresServo,
  servoPosition,
} from "../../blocks/servo/virtual-circuit";
import {
  createTemp,
  createWiresTemp,
  positionTemp,
} from "../../blocks/temperature/virtual-circuit";
import {
  createWiresUltraSonicSensor,
  positionUltraSonicSensor,
  createUltraSonicSensor,
} from "../../blocks/ultrasonic_sensor/virtual-circuit";
import { getSvgString } from "./svg-string";
import { arduinoComponentStateToId } from "../frames/arduino-component-id";
import type {
  BreadBoardArea,
  MicroController,
} from "../microcontroller/microcontroller";
import {
  createButton,
  createWiresButton,
  positionButton,
} from "../../blocks/button/virtual-circuit";
import {
  createWireDigitalSensor,
  positionDigitalSensor,
  createDigitalSensor,
} from "../../blocks/digitalsensor/virtual-circuit";

import {
  analogSensorCreate,
  analogSensorPosition,
  createWireAnalogSensors,
} from "../../blocks/analogsensor/virtual-circuit";
import type { Settings } from "../../firebase/model";
import {
  showPin,
  takeBoardArea,
  takeBoardAreaWithExistingComponent,
} from "./wire";
import {
  createThermistorSensorHook,
  createThermistorWires,
  positionThermistorSensor,
} from "../../blocks/thermistor/virtual-circuit";
import {
  afterCreatePassiveBuzzer,
  createWiresPassiveBuzzer,
  positionPassiveBuzzer,
} from "../../blocks/passivebuzzer/virtual-circuit";
import {
  createWireStepperMotor,
  positionStepperMotor,
} from "../../blocks/steppermotor/virtual-circuit";
import {
  createWiresDigitalDisplay,
  digitalDisplayCreate,
  digitalDisplayPosition,
} from "../../blocks/digit4display/virtual-circuit";
import {
  afterComponentHookJoyStick,
  createWireJoyStick,
  positionJoyStick,
} from "../../blocks/joystick/virtual-circuit";
import { ANALOG_PINS } from "../microcontroller/selectBoard";

export default (
  state: ArduinoComponentState,
  draw: Svg,
  arduinoEl: Element,
  board: MicroController,
  settings: Settings
): void => {
  const id = arduinoComponentStateToId(state);
  let componentEl = draw.findOne("#" + id) as Element;

  if (componentEl) {
    // make sure the area get taken
    takeBoardAreaWithExistingComponent(componentEl.data("holes").split("-"));
    // Show all the analog pins because they will turn off no matter what
    // in paint.
    state.pins
      .filter((p) => ANALOG_PINS.includes(p))
      .forEach((p) => showPin(draw, p));

    return;
  }

  // only take an area if the component does
  // not exist
  const area = takeBoardArea();

  componentEl = createComponentEl(draw, state, getSvgString(state));

  (window as any)[state.type] = componentEl;
  if (area) {
    componentEl.data("holes", area.holes.join("-"));
    positionComponentHookFunc[state.type](
      state,
      componentEl,
      arduinoEl,
      draw,
      board,
      area
    );
    createWires[state.type](
      state,
      draw,
      componentEl,
      arduinoEl,
      id,
      board,
      area
    );
  }
  createComponentHookFunc[state.type](
    state,
    componentEl,
    arduinoEl,
    draw,
    board,
    settings
  );

  if (componentEl.data("disableDraggable") !== "TRUE") {
    addDraggableEvent(componentEl, arduinoEl, draw);
  }
};

export interface PositionComponent<T extends ArduinoComponentState> {
  (
    state: T,
    componentEl: Element,
    arduinoEl: Element,
    draw: Svg,
    board: MicroController,
    area?: BreadBoardArea
  ): void;
}

export interface AfterComponentCreateHook<T extends ArduinoComponentState> {
  (
    state: T,
    componentEl: Element,
    arduinoEl: Element,
    draw: Svg,
    board: MicroController,
    settings: Settings
  ): void;
}

export interface CreateWire<T extends ArduinoComponentState> {
  (
    state: T,
    draw: Svg,
    component: Element,
    arduinoEl: Element,
    componentId: string,
    board: MicroController,
    area?: BreadBoardArea
  ): void;
}

const createNoWires: CreateWire<ArduinoComponentState> = (
  state,
  draw,
  component,
  arduino,
  id,
  area
) => {};

const emptyPositionComponent: PositionComponent<ArduinoComponentState> = (
  state,
  componentEl,
  arduinoEl,
  draw
) => {};

const emptyCreateHookComponent: AfterComponentCreateHook<
  ArduinoComponentState
> = (state, componentEl, arduinoEl, draw, wire) => {};

const createWires: { [key: string]: CreateWire<ArduinoComponentState> } = {
  [ArduinoComponentType.BLUE_TOOTH]: createBluetoothWires as CreateWire<ArduinoComponentState>,
  [ArduinoComponentType.BUTTON]: createWiresButton as CreateWire<ArduinoComponentState>,
  [ArduinoComponentType.IR_REMOTE]: createWiresIrRemote as CreateWire<ArduinoComponentState>,
  [ArduinoComponentType.LCD_SCREEN]: createWiresLcd as CreateWire<ArduinoComponentState>,
  [ArduinoComponentType.LED_COLOR]: createWiresRgbLed as CreateWire<ArduinoComponentState>,
  [ArduinoComponentType.LED_MATRIX]: createWiresLedMatrix as CreateWire<ArduinoComponentState>,
  [ArduinoComponentType.LED]: createWiresLed as CreateWire<ArduinoComponentState>,
  [ArduinoComponentType.MESSAGE]: createNoWires,
  [ArduinoComponentType.MOTOR]: createMotorWires as CreateWire<ArduinoComponentState>,
  [ArduinoComponentType.NEO_PIXEL_STRIP]: createWiresNeoPixels as CreateWire<ArduinoComponentState>,
  [ArduinoComponentType.FASTLED_STRIP]: createWiresFastLEDs as CreateWire<ArduinoComponentState>,
  [ArduinoComponentType.RFID]: createWiresRfid as CreateWire<ArduinoComponentState>,
  [ArduinoComponentType.SERVO]: createWiresServo as CreateWire<ArduinoComponentState>,
  [ArduinoComponentType.WRITE_PIN]: createWiresDigitalAnalogWrite as CreateWire<ArduinoComponentState>,
  [ArduinoComponentType.TEMPERATURE_SENSOR]: createWiresTemp as CreateWire<ArduinoComponentState>,
  [ArduinoComponentType.ULTRASONICE_SENSOR]: createWiresUltraSonicSensor as CreateWire<ArduinoComponentState>,
  [ArduinoComponentType.DIGITAL_SENSOR]: createWireDigitalSensor as CreateWire<ArduinoComponentState>,
  [ArduinoComponentType.ANALOG_SENSOR]: createWireAnalogSensors as CreateWire<ArduinoComponentState>,
  [ArduinoComponentType.THERMISTOR]: createThermistorWires as CreateWire<ArduinoComponentState>,
  [ArduinoComponentType.PASSIVE_BUZZER]: createWiresPassiveBuzzer as CreateWire<ArduinoComponentState>,
  [ArduinoComponentType.STEPPER_MOTOR]: createWireStepperMotor as CreateWire<ArduinoComponentState>,
  [ArduinoComponentType.DIGITAL_DISPLAY]: createWiresDigitalDisplay as CreateWire<ArduinoComponentState>,
  [ArduinoComponentType.JOYSTICK]: createWireJoyStick as CreateWire<ArduinoComponentState>,
};

const positionComponentHookFunc: {
  [key: string]: PositionComponent<ArduinoComponentState>;
} = {
  [ArduinoComponentType.BLUE_TOOTH]: bluetoothPosition as PositionComponent<ArduinoComponentState>,
  [ArduinoComponentType.BUTTON]: positionButton as PositionComponent<ArduinoComponentState>,
  [ArduinoComponentType.IR_REMOTE]: positionIrRemote as PositionComponent<ArduinoComponentState>,
  [ArduinoComponentType.LCD_SCREEN]: lcdPosition as PositionComponent<ArduinoComponentState>,
  [ArduinoComponentType.LED_COLOR]: positionRgbLed as PositionComponent<ArduinoComponentState>,
  [ArduinoComponentType.LED_MATRIX]: ledMatrixPosition as PositionComponent<ArduinoComponentState>,
  [ArduinoComponentType.LED]: ledPosition as PositionComponent<ArduinoComponentState>,
  [ArduinoComponentType.MESSAGE]: emptyPositionComponent,
  [ArduinoComponentType.MOTOR]: motorPosition as PositionComponent<ArduinoComponentState>,
  [ArduinoComponentType.NEO_PIXEL_STRIP]: neoPixelPosition as PositionComponent<ArduinoComponentState>,
  [ArduinoComponentType.FASTLED_STRIP]: fastLEDPosition as PositionComponent<ArduinoComponentState>,
  [ArduinoComponentType.WRITE_PIN]: digitalAnanlogWritePinPosition as PositionComponent<ArduinoComponentState>,
  [ArduinoComponentType.RFID]: positionRfid as PositionComponent<ArduinoComponentState>,
  [ArduinoComponentType.SERVO]: servoPosition as PositionComponent<ArduinoComponentState>,
  [ArduinoComponentType.TEMPERATURE_SENSOR]: positionTemp as PositionComponent<ArduinoComponentState>,
  [ArduinoComponentType.ULTRASONICE_SENSOR]: positionUltraSonicSensor as PositionComponent<ArduinoComponentState>,
  [ArduinoComponentType.DIGITAL_SENSOR]: positionDigitalSensor as PositionComponent<ArduinoComponentState>,
  [ArduinoComponentType.ANALOG_SENSOR]: analogSensorPosition as PositionComponent<ArduinoComponentState>,
  [ArduinoComponentType.THERMISTOR]: positionThermistorSensor as PositionComponent<ArduinoComponentState>,
  [ArduinoComponentType.PASSIVE_BUZZER]: positionPassiveBuzzer as PositionComponent<ArduinoComponentState>,
  [ArduinoComponentType.STEPPER_MOTOR]: positionStepperMotor as PositionComponent<ArduinoComponentState>,
  [ArduinoComponentType.DIGITAL_DISPLAY]: digitalDisplayPosition as PositionComponent<ArduinoComponentState>,
  [ArduinoComponentType.JOYSTICK]: positionJoyStick as PositionComponent<ArduinoComponentState>,
};

const createComponentHookFunc: {
  [key: string]: AfterComponentCreateHook<ArduinoComponentState>;
} = {
  [ArduinoComponentType.BLUE_TOOTH]: bluetoothCreate as AfterComponentCreateHook<ArduinoComponentState>,
  [ArduinoComponentType.BUTTON]: createButton as AfterComponentCreateHook<ArduinoComponentState>,
  [ArduinoComponentType.IR_REMOTE]: createIrRemote as AfterComponentCreateHook<ArduinoComponentState>,
  [ArduinoComponentType.LCD_SCREEN]: lcdCreate as AfterComponentCreateHook<ArduinoComponentState>,
  [ArduinoComponentType.LED_COLOR]: createRgbLed as AfterComponentCreateHook<ArduinoComponentState>,
  [ArduinoComponentType.LED_MATRIX]: ledMatrixCreate as AfterComponentCreateHook<ArduinoComponentState>,
  [ArduinoComponentType.MESSAGE]: arduinoMessageCreate as AfterComponentCreateHook<ArduinoComponentState>,
  [ArduinoComponentType.MOTOR]: motorCreate as AfterComponentCreateHook<ArduinoComponentState>,
  [ArduinoComponentType.NEO_PIXEL_STRIP]: neoPixelCreate as AfterComponentCreateHook<ArduinoComponentState>,
  [ArduinoComponentType.FASTLED_STRIP]: fastLEDCreate as AfterComponentCreateHook<ArduinoComponentState>,
  [ArduinoComponentType.WRITE_PIN]: digitalAnanlogWritePinCreate as AfterComponentCreateHook<ArduinoComponentState>,
  [ArduinoComponentType.LED]: ledCreate as AfterComponentCreateHook<ArduinoComponentState>,
  [ArduinoComponentType.RFID]: createRfid as AfterComponentCreateHook<ArduinoComponentState>,
  [ArduinoComponentType.SERVO]: servoCreate as AfterComponentCreateHook<ArduinoComponentState>,
  [ArduinoComponentType.TEMPERATURE_SENSOR]: createTemp as AfterComponentCreateHook<ArduinoComponentState>,
  [ArduinoComponentType.ULTRASONICE_SENSOR]: createUltraSonicSensor as AfterComponentCreateHook<ArduinoComponentState>,
  [ArduinoComponentType.DIGITAL_SENSOR]: createDigitalSensor as AfterComponentCreateHook<ArduinoComponentState>,
  [ArduinoComponentType.ANALOG_SENSOR]: analogSensorCreate as AfterComponentCreateHook<ArduinoComponentState>,
  [ArduinoComponentType.THERMISTOR]: createThermistorSensorHook as AfterComponentCreateHook<ArduinoComponentState>,
  [ArduinoComponentType.PASSIVE_BUZZER]: afterCreatePassiveBuzzer as AfterComponentCreateHook<ArduinoComponentState>,
  [ArduinoComponentType.STEPPER_MOTOR]: emptyCreateHookComponent,
  [ArduinoComponentType.DIGITAL_DISPLAY]: digitalDisplayCreate as AfterComponentCreateHook<ArduinoComponentState>,
  [ArduinoComponentType.JOYSTICK]: afterComponentHookJoyStick as AfterComponentCreateHook<ArduinoComponentState>,
};
