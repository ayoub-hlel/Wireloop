import { describe, it, expect } from 'vitest';
import Blockly from 'blockly';

// Bucket 9 – Blockly deprecation migration
//
// Migrated all `Blockly.ALIGN_RIGHT` usages to `Blockly.inputs.Align.RIGHT`.
// The new path has been the canonical API since Blockly 9; the old constants
// are removed in v11. This test locks the contract so future upgrades don't
// regress to removed APIs.

describe('Blockly.inputs.Align (deprecation migration)', () => {
  it('Blockly.inputs.Align.RIGHT equals the numeric constant 1', () => {
    expect(Blockly.inputs.Align.RIGHT).toBe(1);
  });

  it('Blockly.inputs.Align.LEFT equals the numeric constant -1', () => {
    expect(Blockly.inputs.Align.LEFT).toBe(-1);
  });

  it('Blockly.inputs.Align.CENTRE equals the numeric constant 0', () => {
    expect(Blockly.inputs.Align.CENTRE).toBe(0);
  });

  it('old Blockly.ALIGN_RIGHT constant resolves to the same value', () => {
    // In Blockly 10 the old constants still exist but are removed in v11.
    // Verify the new path produces the same numeric result.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const legacy = (Blockly as any).ALIGN_RIGHT;
    expect(legacy).toBe(Blockly.inputs.Align.RIGHT);
  });
});
