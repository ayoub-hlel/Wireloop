import type { ArduinoFrame } from "../../../core/frames/arduino.frame";

export type FrameTimeline = { function: string; iteration: number };

/**
 * Index of the first "loop"@iteration-1 frame, else 0. Empty frame lists → 0.
 * All indices here are 0-based into `frames` (WL-010: the Player used a mix of
 * 0-based and 1-based indexing, causing off-by-one playback).
 */
export const firstLoopFrameIndex = (frames: ArduinoFrame[]): number => {
  const idx = frames.findIndex(
    (f) => f.timeLine.function === "loop" && f.timeLine.iteration === 1
  );
  return idx < 0 ? 0 : idx;
};

/**
 * Given the currently displayed timeline and a (possibly new) frame list,
 * return the 0-based index to jump to so playback resumes at the matching
 * loop iteration. Mirrors Player.svelte's navigateToClosestTimeline logic.
 */
export const navigateToClosestTimeline = (
  frames: ArduinoFrame[],
  timeLine: FrameTimeline
): number => {
  if (frames.length === 0) return 0;
  if (timeLine.function !== "loop" || timeLine.iteration <= 1) {
    return firstLoopFrameIndex(frames);
  }
  const lastFrameTimeLine = frames[frames.length - 1].timeLine;
  if (timeLine.iteration > lastFrameTimeLine.iteration) {
    return frames.findIndex(
      (f) => f.timeLine.iteration === lastFrameTimeLine.iteration
    );
  }
  return frames.findIndex((f) => f.timeLine.iteration === timeLine.iteration);
};

/** 0-based next index, clamped to the last frame. Empty frames → 0. */
export const nextFrameIndex = (current: number, length: number): number =>
  length === 0 ? 0 : Math.min(current + 1, length - 1);

/** 0-based previous index, clamped to the first frame. Empty frames → 0. */
export const prevFrameIndex = (current: number, length: number): number =>
  length === 0 ? 0 : Math.max(current - 1, 0);
