
import {
  AfterComponentCreateHook,
  CreateWire,
  PositionComponent,
} from "../../core/virtual-circuit/svg-create";
import { positionComponent } from "../../core/virtual-circuit/svg-position";
import {
  ResetComponent,
  SyncComponent,
} from "../../core/virtual-circuit/svg-sync";
import {
  createComponentWire,
  createGroundOrPowerWire,
} from "../../core/virtual-circuit/wire";
import { PassiveBuzzerState, Notes } from "./state";

export const afterCreatePassiveBuzzer: AfterComponentCreateHook<PassiveBuzzerState> = (
  state,
  componentEl,
) => {
  const pin = state.pins[0];
  componentEl.findOne("#PIN_TEXT")!.node.textContent = pin;
};

export const updatePassiveBuzzer: SyncComponent = (
  state,
  componentEl,
) => {
  const buzzerState = state as PassiveBuzzerState;

  if (buzzerState.displaySimpleOn) {
    componentEl.findOne("#NOTE_TEXT")!.node.textContent =
      buzzerState.tone > 0 ? "On" : "Off";
    return;
  }

  if (buzzerState.tone > 0) {
    componentEl.findOne("#NOTE_TEXT")!.node.textContent =
      Notes[buzzerState.tone] ?? buzzerState.tone;

    return;
  }

  componentEl.findOne("#NOTE_TEXT")!.node.textContent = "Off";
};

export const positionPassiveBuzzer: PositionComponent<PassiveBuzzerState> = (
  state,
  componentEl,
  arduinoEl,
  draw,
  board,
  area
) => {
  const { holes, isDown } = area!;
  positionComponent(componentEl, arduinoEl, draw, holes[2], isDown, "PIN_GND");
};

export const createWiresPassiveBuzzer: CreateWire<PassiveBuzzerState> = (
  state,
  draw,
  passiveBuzzerEl,
  arduinoEl,
  componentId,
  board,
  area
) => {
  const { holes, isDown } = area!;

  createGroundOrPowerWire(
    holes[3],
    isDown,
    passiveBuzzerEl,
    draw,
    arduinoEl,
    componentId,
    "ground"
  );

  createComponentWire(
    holes[0],
    isDown,
    passiveBuzzerEl,
    state.pins[0],
    draw,
    arduinoEl,
    componentId,
    "PIN_DATA",
    board
  );
};

export const resetPassiveBuzzer: ResetComponent = (component) => {
  component.findOne("#NOTE_TEXT")!.node.textContent = "";
};
