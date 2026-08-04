import { describe, it, expect } from 'vitest';
import {
  getDefaultValue,
  getDefaultValueList,
} from '@/core/frames/transformer/frame-transformer.helpers';
import { VariableTypes } from '@/core/blockly/dto/variable.type';

// getDefaultValue feeds every variable-set frame transformer its fallback
// value. The previous `default: undefined` made list variables default to an
// invalid Variable.value and leaked `undefined` into the return union, which
// broke assignment at the call sites. Lock the exhaustive contract.
describe('getDefaultValue / getDefaultValueList', () => {
  it('returns scalar defaults for scalar variable types', () => {
    expect(getDefaultValue(VariableTypes.NUMBER)).toBe(0);
    expect(getDefaultValue(VariableTypes.STRING)).toBe('');
    expect(getDefaultValue(VariableTypes.BOOLEAN)).toBe(true);
    expect(getDefaultValue(VariableTypes.COLOUR)).toEqual({ red: 0, green: 0, blue: 0 });
  });

  it('returns an empty list for list variable types (regression: was undefined)', () => {
    expect(getDefaultValue(VariableTypes.LIST_NUMBER)).toEqual([]);
    expect(getDefaultValue(VariableTypes.LIST_STRING)).toEqual([]);
    expect(getDefaultValue(VariableTypes.LIST_BOOLEAN)).toEqual([]);
    expect(getDefaultValue(VariableTypes.LIST_COLOUR)).toEqual([]);
  });

  it('getDefaultValueList returns scalar defaults without undefined', () => {
    expect(getDefaultValueList(VariableTypes.NUMBER)).toBe(0);
    expect(getDefaultValueList(VariableTypes.BOOLEAN)).toBe(false);
  });
});
