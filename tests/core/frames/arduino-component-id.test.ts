import { describe, it, expect } from 'vitest';
import { arduinoComponentStateToId } from '@/core/frames/arduino-component-id';
import { ArduinoComponentType, type ArduinoComponentState } from '@/core/frames/arduino.frame';

const makeState = (type: ArduinoComponentType, pins: number[]) =>
  ({ type, pins } as unknown as ArduinoComponentState);

// arduinoComponentStateToId dispatches to a per-type identity generator; used
// by the Simulator's frame loop to detect component-set changes. Lock the generic
// contract + the unknown-type throw.
describe('arduinoComponentStateToId (component identity)', () => {
  it('generic type produces "TYPE" + sorted pins', () => {
    expect(arduinoComponentStateToId(makeState(ArduinoComponentType.SERVO, [3, 1, 2]))).toBe(
      'SERVO_COMPONENT_1-2-3'
    );
  });

  it('message components collapse to the constant type id', () => {
    expect(arduinoComponentStateToId(makeState(ArduinoComponentType.MESSAGE, []))).toBe(
      'MESSAGE_COMPONENT'
    );
  });

  it('throws for an unknown component type', () => {
    expect(() => arduinoComponentStateToId({ type: 'NOPE', pins: [] } as any)).toThrow(
      /No Id generator/i
    );
  });
});