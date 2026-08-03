import { describe, it, expect, vi, afterEach } from 'vitest';
import type { BlockSvg } from 'blockly';
import * as blockHelper from '@/core/blockly/helpers/block.helper';
import {
  arduinoLoopBlockShowLoopForeverText,
  arduinoLoopBlockShowNumberOfTimesThroughLoop,
} from '@/core/blockly/helpers/arduino_loop_block.helper';

// WL-005: the arduino_loop block has two visual modes — inputList[0] = "Loop runs
// forever", inputList[1] = "Loop runs N times in virtual circuit". The layout and
// Blockly.svelte both drove these helpers (the conflict); only Blockly.svelte's
// prop does now. Lock the toggle + render contract.
describe('arduino_loop block mode toggle (WL-005)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const makeBlock = () => {
    const inputs = [{ setVisible: vi.fn() }, { setVisible: vi.fn() }];
    const render = vi.fn();
    vi.spyOn(blockHelper, 'getBlockByType').mockReturnValue({
      inputList: inputs,
      render,
    } as unknown as BlockSvg);
    return { inputs, render };
  };

  it('number-of-times mode hides the forever label and shows the LOOP_TIMES input', () => {
    const { inputs, render } = makeBlock();
    arduinoLoopBlockShowNumberOfTimesThroughLoop();
    expect(inputs[0].setVisible).toHaveBeenCalledWith(false);
    expect(inputs[1].setVisible).toHaveBeenCalledWith(true);
    expect(render).toHaveBeenCalled();
  });

  it('forever mode shows the label and hides the LOOP_TIMES input', () => {
    const { inputs, render } = makeBlock();
    arduinoLoopBlockShowLoopForeverText();
    expect(inputs[0].setVisible).toHaveBeenCalledWith(true);
    expect(inputs[1].setVisible).toHaveBeenCalledWith(false);
    expect(render).toHaveBeenCalled();
  });
});
