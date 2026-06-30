import { writable, get } from "svelte/store";
import { MicroControllerType } from "../core/microcontroller/microcontroller";

const resetCode = `int simple_loop_variable = 0;
struct RGB {
	int red;
	int green;
	int blue;
};




void setup() {

}


void loop() {

}
`;

export interface CodeInfo {
  code: string;
  boardType: MicroControllerType;
}

const codeStore = writable<CodeInfo>({
  code: resetCode,
  boardType: MicroControllerType.ARDUINO_UNO,
});

const store = {
  subscribe: codeStore.subscribe,
  set: codeStore.set,
  update: codeStore.update,
  resetCode: (boardType: MicroControllerType) =>
    codeStore.set({ code: resetCode, boardType }),
  // ponytail: convenience accessors, avoids importing `get` everywhere
  get currentCode(): string {
    return get(codeStore).code;
  },
  get currentBoard(): MicroControllerType {
    return get(codeStore).boardType;
  },
  get currentState(): CodeInfo {
    return get(codeStore);
  },
};

export default store;
