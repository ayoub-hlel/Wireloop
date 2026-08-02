import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Workspace, type WorkspaceSvg } from "blockly";
import * as workspaceHelper from "@/core/blockly/helpers/workspace.helper";

const { mockMark, mockFail } = vi.hoisted(() => ({
  mockMark: vi.fn(),
  mockFail: vi.fn(),
}));
vi.mock("$lib/telemetry/boot", () => ({ mark: mockMark, fail: mockFail }));

const loaded = () =>
  mockMark.mock.calls.some((c) => c[0] === "loadProject:loaded");

// WL-006: loadProject was dropping the load when the workspace wasn't ready.
// It now defers and retries until the workspace exists (or gives up with a
// diagnostic). Workspace readiness is driven via the test-only override seam.
describe("loadProject deferred load (WL-006)", () => {
  let ws: Workspace;

  beforeEach(() => {
    mockMark.mockClear();
    mockFail.mockClear();
    vi.useFakeTimers();
    workspaceHelper._resetLoadProjectForTests();
    ws = new Workspace();
    // scrollCenter exists only on SVG workspaces; stub it for the headless one.
    (ws as unknown as { scrollCenter: () => void }).scrollCenter = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    workspaceHelper._resetLoadProjectForTests();
  });

  it("loads immediately when the workspace exists", () => {
    workspaceHelper._setWorkspaceOverrideForTests(ws as unknown as WorkspaceSvg);
    workspaceHelper.loadProject("<xml></xml>");
    expect(loaded()).toBe(true);
  });

  it("defers when the workspace is missing, then loads once it appears", async () => {
    workspaceHelper.loadProject("<xml></xml>");
    expect(loaded()).toBe(false); // deferred, not loaded

    workspaceHelper._setWorkspaceOverrideForTests(ws as unknown as WorkspaceSvg);
    await vi.advanceTimersByTimeAsync(150); // retry timer fires

    expect(loaded()).toBe(true);
  });

  it("gives up with a diagnostic when the workspace never appears", async () => {
    workspaceHelper.loadProject("<xml></xml>");
    await vi.advanceTimersByTimeAsync(2500); // past MAX_RETRIES × 100ms

    expect(loaded()).toBe(false);
    expect(mockFail).toHaveBeenCalledWith("loadProject:give-up", expect.anything());
  });
});
