import { describe, it, expect, vi } from 'vitest';
import * as blockHelper from '@/core/blockly/helpers/block.helper';
import {
  configuredPins,
  getAvailablePins,
} from '@/core/blockly/helpers/getAvialablePinsFromSetupBlock';

const potential: [string, string][] = [
  ['2', '2'],
  ['3', '3'],
  ['4', '4'],
  ['5', '5'],
];
const fakePinBlock = (pin: string) => ({
  getFieldValue: (k: string) => (k === 'PIN' ? pin : ''),
});

// Pin-allocation logic for the setup blocks: configured pins are excluded from
// the dropdown unless it is the currently-selected pin; an empty result is a
// NO_PINS sentinel. Lock the edge cases.
describe('pin availability (getAvialablePinsFromSetupBlock)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('configuredPins reads the PIN field of matching setup blocks', () => {
    vi.spyOn(blockHelper, 'getBlocksByName').mockReturnValue([fakePinBlock('2'), fakePinBlock('4')]);
    expect(configuredPins('setup_digital', potential)).toEqual([
      ['2', '2'],
      ['4', '4'],
    ]);
  });

  it('returns all pins when none are configured', () => {
    vi.spyOn(blockHelper, 'getBlocksByName').mockReturnValue([]);
    expect(getAvailablePins('setup_digital', '2', potential)).toEqual(potential);
  });

  it('excludes configured pins but keeps the currently selected pin', () => {
    vi.spyOn(blockHelper, 'getBlocksByName').mockReturnValue([
      fakePinBlock('2'),
      fakePinBlock('4'),
    ]);
    expect(getAvailablePins('setup_digital', '2', potential)).toEqual([
      ['2', '2'],
      ['3', '3'],
      ['5', '5'],
    ]);
  });

  it('keeps only the free pin when everything else is taken', () => {
    vi.spyOn(blockHelper, 'getBlocksByName').mockReturnValue([
      fakePinBlock('2'),
      fakePinBlock('3'),
      fakePinBlock('4'),
    ]);
    expect(getAvailablePins('setup_digital', '5', potential)).toEqual([['5', '5']]);
  });
});