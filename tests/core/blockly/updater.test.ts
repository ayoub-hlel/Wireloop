import { describe, it, expect, vi, afterEach } from "vitest";
import "@/core/blockly/blocks";
import { createArduinoAndWorkSpace } from "../../app/tests.helper";
import { updater } from "@/core/blockly/updater";
import { ActionType } from "@/core/blockly/actions/actions";
import * as workspaceHelper from "@/core/blockly/helpers/workspace.helper";

// Regression: every updater handler looks up its block via
// getBlockById/getBlockByType, which return undefined when the workspace is
// missing or the block was removed. The handlers previously dereferenced the
// block unguarded, so a stale action (e.g. a disable/save action racing with
// block deletion) threw a TypeError. Guards make those no-ops.
describe("updater robustness against missing blocks", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not throw when an action targets a block that no longer exists", () => {
    const action = {
      type: ActionType.DISABLE_BLOCK,
      blockId: "does-not-exist",
      warningText: "test",
      stopCompiling: false,
    };
    expect(() => updater(action)).not.toThrow();
  });

  it("does not throw with no workspace at all (studio-boot scenario)", () => {
    vi.spyOn(workspaceHelper, "getWorkspace").mockReturnValue(undefined as never);
    const action = {
      type: ActionType.DISABLE_BLOCK,
      blockId: "any-id",
      warningText: "test",
      stopCompiling: false,
    };
    expect(() => updater(action)).not.toThrow();
  });

  it("still applies an action to an existing block", () => {
    const [workspace, arduinoBlock] = createArduinoAndWorkSpace();
    try {
      const action = {
        type: ActionType.DISABLE_BLOCK,
        blockId: arduinoBlock.id,
        warningText: "test",
        stopCompiling: false,
      };
      updater(action);
      expect(arduinoBlock.isEnabled()).toBe(false);
    } finally {
      workspace.dispose();
    }
  });
});
