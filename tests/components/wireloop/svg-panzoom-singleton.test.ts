/**
 * Regression lock for the blank-emulator bug: pnpm resolved TWO copies of
 * @svgdotjs/svg.js (3.2.7 for svg.panzoom.js's dependency, 3.2.8 for the app),
 * so the panzoom plugin attached to a different class registry than the app's
 * SVG() — `.panZoom()` was undefined and Simulator.svelte died before any
 * store subscriptions registered. The pnpm override in pnpm-workspace.yaml
 * pins one version; this test fails if the copies ever diverge again.
 *
 * Note: vitest resolves the UMD `main` field while vite uses the ESM src, so
 * we import the ESM build directly — same thing vite dev/build load.
 */
import { describe, it, expect } from "vitest";
import { Svg } from "@svgdotjs/svg.js";

describe("svg.js plugin singleton", () => {
  it("panZoom attaches to the same Svg class the app imports", async () => {
    await import("@svgdotjs/svg.panzoom.js/dist/svg.panzoom.esm.js");
    expect(
      typeof (Svg.prototype as unknown as { panZoom?: unknown }).panZoom,
    ).toBe("function");
  });
});
