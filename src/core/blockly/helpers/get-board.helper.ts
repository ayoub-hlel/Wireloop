import settingsStore from '../../../stores/settings.store';
import { MicroControllerType } from '../../microcontroller/microcontroller';
import { get } from 'svelte/store';

export const getBoardType = (): MicroControllerType => {
  const currentSettings = get(settingsStore);
  if (!currentSettings) {
    return MicroControllerType.ARDUINO_UNO;
  }
  // Convert string board type to MicroControllerType enum if needed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  const boardType = (currentSettings as any)["boardType"] as string;
  if (boardType === 'ARDUINO_UNO' || boardType === 'uno') {
    return MicroControllerType.ARDUINO_UNO;
  }
  if (boardType === 'ARDUINO_MEGA' || boardType === 'mega') {
    return MicroControllerType.ARDUINO_MEGA;
  }
  // ARDUINO_NANO maps to UNO as there's no NANO enum
  return MicroControllerType.ARDUINO_UNO;
};
