import { writable } from "svelte/store";
import type { ArduinoFrameContainer } from "../core/frames/arduino.frame";
import { MicroControllerType } from "../core/microcontroller/microcontroller";
import { defaultSetting } from "../types/arduino-sim";

const stateStore = writable<ArduinoFrameContainer>({
  frames: [],
  board: MicroControllerType.ARDUINO_UNO,
  error: false,
  settings: defaultSetting,
});

export default {
  subscribe: stateStore.subscribe,
  set: stateStore.set,
  update: stateStore.update,
};
