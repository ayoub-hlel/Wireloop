import { describe, it, expect } from 'vitest';
import { findSensorState } from '@/core/blockly/helpers/sensor_block.helper';
import type { BlockData } from '@/core/blockly/dto/block.type';
import type { Timeline } from '@/core/frames/arduino.frame';

const makeBlock = (metaData?: string) => ({ metaData }) as unknown as BlockData;
const makeTimeline = (iteration: number, fn: string) =>
  ({ iteration, function: fn }) as unknown as Timeline;

// findSensorState deserialises the block's JSON metaData and picks the sensor
// whose `loop` matches the timeline iteration (or loop=1 for setup phases).
// Lock the contract against malformed/empty data and the setup-phase fallback.
describe('findSensorState (sensor state matching)', () => {
  it('returns the sensor whose loop matches the timeline iteration', () => {
    const block = makeBlock(
      JSON.stringify([
        { loop: 1, value: 42 },
        { loop: 2, value: 99 },
      ])
    );
    expect(findSensorState(block, makeTimeline(2, 'loop'))).toEqual({
      loop: 2,
      value: 99,
    });
  });

  it('falls back to loop=1 for setup / pre-setup phases', () => {
    const block = makeBlock(JSON.stringify([{ loop: 1, value: 'setup-val' }]));
    expect(findSensorState(block, makeTimeline(99, 'setup'))).toEqual({ loop: 1, value: 'setup-val' });
    expect(findSensorState(block, makeTimeline(99, 'pre-setup'))).toEqual({
      loop: 1,
      value: 'setup-val',
    });
  });

  it('returns undefined when metaData is empty', () => {
    expect(findSensorState(makeBlock(''), makeTimeline(1, 'loop'))).toBeUndefined();
  });

  it('returns undefined for malformed JSON (no throw)', () => {
    expect(findSensorState(makeBlock('not-json'), makeTimeline(1, 'loop'))).toBeUndefined();
  });
});