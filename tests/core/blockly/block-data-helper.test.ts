import { describe, it, expect } from 'vitest';
import { findFieldValue, findPin } from '@/core/blockly/helpers/block-data.helper';
import type { BlockData } from '@/core/blockly/dto/block.type';
import { ARDUINO_PINS } from '@/core/microcontroller/selectBoard';

const makeBlock = (fieldValues: { name: string; value: string }[]) =>
  ({ fieldValues }) as unknown as BlockData;

// findFieldValue is the single accessor every block-to-frame/value transformer
// uses for dropdown/text fields. The value type is `string`; a missing field
// yields '' (not undefined) so callers can pass the result straight to pin
// lookups. Lock that contract so it doesn't regress to `unknown`/`undefined`.
describe('findFieldValue / findPin (block field accessor)', () => {
  it('returns the string value of an existing field', () => {
    expect(findFieldValue(makeBlock([{ name: 'PIN', value: '13' }]), 'PIN')).toBe('13');
  });

  it('returns "" (not undefined) for a missing field', () => {
    expect(findFieldValue(makeBlock([]), 'PIN')).toBe('');
  });

  it('findPin returns the value as an ARDUINO_PINS pin', () => {
    expect(findPin(makeBlock([{ name: 'PIN', value: ARDUINO_PINS.PIN_13 }]), 'PIN')).toBe(
      ARDUINO_PINS.PIN_13
    );
  });
});
