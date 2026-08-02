import { describe, it, expect, vi } from "vitest";
import { Workspace } from "blockly";
import "@/core/blockly/blocks";
import * as workspaceHelper from "@/core/blockly/helpers/workspace.helper";
import * as blockHelper from "@/core/blockly/helpers/block.helper";
import {
  arduinoLoopBlockShowLoopForeverText,
  isArduinoLoopBlockId,
  getTimesThroughLoop,
} from "@/core/blockly/helpers/arduino_loop_block.helper";

// WL-014: every helper that reads the workspace must tolerate it being
// undefined (studio boot calls these before Blockly.getMainWorkspace() exists).
describe("WL-014 workspace guards", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getAllBlocks/getTopBlocks return [] and getBlockByType/getBlockById return undefined with no workspace", () => {
    vi.spyOn(workspaceHelper, "getWorkspace").mockReturnValue(undefined as never);

    expect(blockHelper.getAllBlocks()).toEqual([]);
    expect(blockHelper.getTopBlocks()).toEqual([]);
    expect(blockHelper.getBlockByType("arduino_loop")).toBeUndefined();
    expect(blockHelper.getBlockById("missing")).toBeUndefined();
  });

  it("arduinoLoopBlockShowLoopForeverText does not throw with no workspace (the WL-014 crash site)", () => {
    vi.spyOn(workspaceHelper, "getWorkspace").mockReturnValue(undefined as never);

    expect(() => arduinoLoopBlockShowLoopForeverText()).not.toThrow();
  });

  it("isArduinoLoopBlockId returns false and getTimesThroughLoop defaults to 3 with no workspace", () => {
    vi.spyOn(workspaceHelper, "getWorkspace").mockReturnValue(undefined as never);

    expect(isArduinoLoopBlockId("x")).toBe(false);
    expect(getTimesThroughLoop()).toBe(3);
  });

  it("helpers find blocks once a workspace with an arduino_loop block exists", () => {
    const ws = new Workspace();
    const loopBlock = ws.newBlock("arduino_loop");
    vi.spyOn(workspaceHelper, "getWorkspace").mockReturnValue(ws as never);

    expect(blockHelper.getAllBlocks().length).toBeGreaterThan(0);
    expect(blockHelper.getBlockByType("arduino_loop")).toBeDefined();
    expect(isArduinoLoopBlockId(loopBlock.id)).toBe(true);
    expect(blockHelper.getBlockById(loopBlock.id)).toBeDefined();
  });
});
