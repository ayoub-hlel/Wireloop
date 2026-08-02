import { describe, it, expect } from "vitest";
import {
  firstLoopFrameIndex,
  navigateToClosestTimeline,
  nextFrameIndex,
  prevFrameIndex,
} from "@/components/wireloop/home/player-navigation";
import type { ArduinoFrame } from "@/core/frames/arduino.frame";

// WL-010: Player used mixed 0/1-based indexing. All helpers here are 0-based
// and must stay consistent across empty / single / multi-frame playback.
const makeFrame = (fn: string, iteration: number) =>
  ({ timeLine: { function: fn, iteration } }) as unknown as ArduinoFrame;

describe("firstLoopFrameIndex", () => {
  it("returns 0 for empty frames", () => {
    expect(firstLoopFrameIndex([])).toBe(0);
  });

  it("returns 0 when no loop@iteration 1 frame exists", () => {
    const frames = [makeFrame("loop", 2), makeFrame("setup", 0)];
    expect(firstLoopFrameIndex(frames)).toBe(0);
  });

  it("returns the index of the loop@iteration 1 frame", () => {
    const frames = [makeFrame("setup", 0), makeFrame("loop", 1), makeFrame("loop", 2)];
    expect(firstLoopFrameIndex(frames)).toBe(1);
  });
});

describe("navigateToClosestTimeline", () => {
  it("returns 0 for empty frames", () => {
    expect(navigateToClosestTimeline([], { function: "loop", iteration: 1 })).toBe(0);
  });

  it("returns the loop@1 index for a non-loop or first-iteration timeline", () => {
    const frames = [makeFrame("loop", 1), makeFrame("loop", 2), makeFrame("loop", 3)];
    expect(navigateToClosestTimeline(frames, { function: "setup", iteration: 0 })).toBe(0);
    expect(navigateToClosestTimeline(frames, { function: "loop", iteration: 1 })).toBe(0);
  });

  it("returns the matching loop-iteration index within range", () => {
    const frames = [
      makeFrame("loop", 1),
      makeFrame("loop", 1),
      makeFrame("loop", 2),
      makeFrame("loop", 3),
    ];
    expect(navigateToClosestTimeline(frames, { function: "loop", iteration: 2 })).toBe(2);
    expect(navigateToClosestTimeline(frames, { function: "loop", iteration: 3 })).toBe(3);
  });

  it("clamps to the last loop iteration when past the end", () => {
    const frames = [makeFrame("loop", 1), makeFrame("loop", 2), makeFrame("loop", 3)];
    expect(navigateToClosestTimeline(frames, { function: "loop", iteration: 99 })).toBe(2);
  });
});

describe("nextFrameIndex / prevFrameIndex (0-based, clamped)", () => {
  it("stays at 0 for empty frames", () => {
    expect(nextFrameIndex(0, 0)).toBe(0);
    expect(prevFrameIndex(0, 0)).toBe(0);
  });

  it("single frame: no movement", () => {
    expect(nextFrameIndex(0, 1)).toBe(0);
    expect(prevFrameIndex(0, 1)).toBe(0);
  });

  it("multi-frame: advances and clamps at the ends", () => {
    expect(nextFrameIndex(0, 3)).toBe(1);
    expect(nextFrameIndex(2, 3)).toBe(2); // at last → stays
    expect(prevFrameIndex(2, 3)).toBe(1);
    expect(prevFrameIndex(0, 3)).toBe(0); // at first → stays
  });
});
