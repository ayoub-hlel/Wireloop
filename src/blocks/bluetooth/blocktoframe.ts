import type { BlockToFrameTransformer } from "../../core/frames/transformer/block-to-frame.transformer";
import cloneDeep from "lodash/cloneDeep";
import { ArduinoComponentType } from "../../core/frames/arduino.frame";
import { findPin } from "../../core/blockly/helpers/block-data.helper";
import { arduinoFrameByComponent } from "../../core/frames/transformer/frame-transformer.helpers";
import { getInputValue } from "../../core/frames/transformer/block-to-value.factories";
import type { BluetoothSensor, BluetoothState } from "./state";

export const bluetoothSetup: BlockToFrameTransformer = (
  blocks,
  block,
  variables,
  timeline,
  previousState
) => {
  let btSensorDatum: BluetoothSensor[] = [];
  try {
    btSensorDatum = JSON.parse(block.metaData) as BluetoothSensor[];
  // eslint-disable-next-line no-empty
  } catch {
  }
  const btSensor = btSensorDatum.find((d) => d.loop === 1);
  if (!btSensor) return [];

  const bluetoothComponent: BluetoothState = {
    pins: block.pins.sort(),
    type: ArduinoComponentType.BLUE_TOOTH,
    rxPin: findPin(block, "PIN_RX"),
    txPin: findPin(block, "PIN_TX"),
    hasMessage: btSensor.receiving_message,
    message: btSensor.message,
    sendMessage: "",
  };

  return [
    arduinoFrameByComponent(
      block.id,
      block.blockName,
      timeline,
      bluetoothComponent,
      "Setting up Bluetooth.",
      previousState
    ),
  ];
};

export const bluetoothMessage: BlockToFrameTransformer = (
  blocks,
  block,
  variables,
  timeline,
  previousState
) => {
  if (!previousState) return [];
  const message = getInputValue(
    blocks,
    block,
    variables,
    timeline,
    "MESSAGE",
    "",
    previousState
  );
  const btComponent = previousState.components.find(
    (c) => c.type === ArduinoComponentType.BLUE_TOOTH
  ) as BluetoothState;
  const newComponent = cloneDeep(btComponent);
  newComponent.sendMessage = message;

  return [
    arduinoFrameByComponent(
      block.id,
      block.blockName,
      timeline,
      newComponent,
      `Sending "${message}" from bluetooth to computer.`,
      previousState
    ),
  ];
};
