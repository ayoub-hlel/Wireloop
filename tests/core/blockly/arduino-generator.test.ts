import { describe, it, expect } from 'vitest';
import Blockly from 'blockly';
import { createArduinoAndWorkSpace } from '../../app/tests.helper';
import '@/core/blockly/blocks';
import '@/core/blockly/generators';

// WL-001 (P0): workspaceToCode used to throw `ReferenceError: i is not defined`
// (undeclared loop variable from the c98a016 refactor) and emit code that began
// with the literal `undefined` (`let variableCode;`). Lock the fixed generator.
describe('arduino code generator (WL-001 regression)', () => {
  it('workspaceToCode does not throw and emits no "undefined" prefix', () => {
    const [workspace] = createArduinoAndWorkSpace();
    let code = '';
    expect(() => {
      code = Blockly['Arduino'].workspaceToCode(workspace);
    }).not.toThrow();
    expect(code.startsWith('undefined')).toBe(false);
    expect(code.length).toBeGreaterThan(0);
  });
});
