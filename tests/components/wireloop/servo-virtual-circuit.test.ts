import { describe, it, expect, vi } from 'vitest';
import { servoPosition } from '@/blocks/servo/virtual-circuit';
import { updateIrRemote } from '@/blocks/ir_remote/virtual-circuit';
import { updateDigitalSensor } from '@/blocks/digitalsensor/virtual-circuit';
import { digitalDisplayUpdate } from '@/blocks/digit4display/virtual-circuit';
import { DigitalPictureType } from '@/blocks/digitalsensor/state';

const mockElement = () =>
  ({
    findOne: vi.fn(() => mockElement()),
    show: vi.fn(),
    hide: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    x: vi.fn(() => 0),
    y: vi.fn(() => 0),
    cx: vi.fn(() => 0),
    height: vi.fn(() => 0),
    node: { innerHTML: '', style: { fill: '' } },
    data: vi.fn(),
  }) as any;

const mockSvg = () => ({ findOne: vi.fn(() => mockElement()) }) as any;

const area = { holes: [0, 1, 2, 3, 4, 5], isDown: false };

describe('virtual-circuit sync hooks use concrete state (WL-007)', () => {
  it('servoPosition does not throw — params area/arduinoEl/draw are not underscore-prefixed', () => {
    const servoState = {
      type: 'SERVO' as const,
      degree: 90,
      pins: ['3'],
      pinsConfig: [],
    };
    expect(() =>
      servoPosition(servoState as any, mockElement(), mockElement(), mockSvg(), mockElement(), area as any),
    ).not.toThrow();
  });

  it('updateIrRemote accesses irState.code (not state.code)', () => {
    const irState = {
      type: 'IR_REMOTE' as const,
      code: '0x1234',
      hasCode: true,
      pins: ['11'],
      pinsConfig: [],
    };
    const el = mockElement();
    updateIrRemote(irState as any, el, mockSvg(), undefined);
    expect(el.findOne).toHaveBeenCalledWith('#code');
  });

  it('updateDigitalSensor reads sensorState.pictureType and sensorState.isOn', () => {
    const digitalState = {
      type: 'DIGITAL_SENSOR' as const,
      pin: '2',
      pins: ['2'],
      pictureType: DigitalPictureType.TOUCH_SENSOR,
      isOn: true,
      pinsConfig: [],
    };
    const el = mockElement();
    expect(() =>
      updateDigitalSensor(digitalState as any, el, mockSvg(), undefined),
    ).not.toThrow();
  });

  it('digitalDisplayUpdate accesses displayState.colonOn (not state.colonOn)', () => {
    const displayState = {
      type: 'DIGITAL_DISPLAY' as const,
      chars: ['A', 'B', 'C', 'D'],
      colonOn: true,
      dioPin: '4',
      clkPin: '5',
      pins: ['4', '5'],
      pinsConfig: [],
    };
    const el = mockElement();
    expect(() =>
      digitalDisplayUpdate(displayState as any, el, mockSvg(), undefined),
    ).not.toThrow();
  });
});
