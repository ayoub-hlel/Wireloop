import { describe, it, expect } from 'vitest';
import { hexToRgb, rgbToHex, rgbToColorStruct } from '@/core/blockly/helpers/color.helper';

describe('color.helper (hex <-> RGB)', () => {
  it('hexToRgb parses full #RRGGBB', () => {
    expect(hexToRgb('#ff0000')).toEqual({ red: 255, green: 0, blue: 0 });
    expect(hexToRgb('#00ff00')).toEqual({ red: 0, green: 255, blue: 0 });
  });

  it('hexToRgb expands shorthand #RGB', () => {
    expect(hexToRgb('03F')).toEqual({ red: 0, green: 51, blue: 255 });
    expect(hexToRgb('#f00')).toEqual({ red: 255, green: 0, blue: 0 });
  });

  it('hexToRgb works without the leading #', () => {
    expect(hexToRgb('0000ff')).toEqual({ red: 0, green: 0, blue: 255 });
  });

  it('rgbToHex pads single-hex components', () => {
    expect(rgbToHex({ red: 255, green: 0, blue: 0 })).toBe('#ff0000');
    expect(rgbToHex({ red: 0, green: 51, blue: 255 })).toBe('#0033ff');
  });

  it('rgbToColorStruct emits a CSS struct string', () => {
    expect(rgbToColorStruct({ red: 255, green: 0, blue: 0 })).toBe('{255, 0, 0}');
  });
});