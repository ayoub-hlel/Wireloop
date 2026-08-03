import { describe, it, expect, vi } from 'vitest';
import { MicroControllerType } from '@/core/microcontroller/microcontroller';

// getBoardType reads the settings store via get(). Mock the store's subscribe
// to return a controllable settings value (no cloud-sync side effects).
let currentSettings: { boardType?: string } | null | undefined;
vi.mock('@/stores/settings.store', () => ({
  default: {
    subscribe: (fn: (v: typeof currentSettings) => void) => {
      fn(currentSettings);
      return () => {};
    },
  },
}));

import { getBoardType } from '@/core/blockly/helpers/get-board.helper';

// Board selection: getBoardType normalizes both storage spellings of the board
// type (the models.Settings type says uppercase, the runtime enum says
// lowercase) and falls back to ARDUINO_UNO. Close the board-selection gap.
describe('getBoardType (board selection)', () => {
  afterEach(() => {
    currentSettings = null;
    vi.restoreAllMocks();
  });

  it('returns ARDUINO_UNO for the lowercase "uno" runtime value', () => {
    currentSettings = { boardType: 'uno' };
    expect(getBoardType()).toBe(MicroControllerType.ARDUINO_UNO);
  });

  it('returns ARDUINO_UNO for the uppercase models-type value', () => {
    currentSettings = { boardType: 'ARDUINO_UNO' };
    expect(getBoardType()).toBe(MicroControllerType.ARDUINO_UNO);
  });

  it('returns ARDUINO_MEGA for "mega" (either casing)', () => {
    currentSettings = { boardType: 'mega' };
    expect(getBoardType()).toBe(MicroControllerType.ARDUINO_MEGA);
    currentSettings = { boardType: 'ARDUINO_MEGA' };
    expect(getBoardType()).toBe(MicroControllerType.ARDUINO_MEGA);
  });

  it('falls back to UNO for ARDUINO_NANO (no NANO enum)', () => {
    currentSettings = { boardType: 'ARDUINO_NANO' };
    expect(getBoardType()).toBe(MicroControllerType.ARDUINO_UNO);
  });

  it('returns UNO when settings are missing', () => {
    currentSettings = undefined;
    expect(getBoardType()).toBe(MicroControllerType.ARDUINO_UNO);
  });
});