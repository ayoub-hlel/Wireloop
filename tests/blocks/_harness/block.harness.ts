/**
 * Table-driven harness for block regression tests.
 *
 * Every block category gets the same ritual for free:
 *   build stack -> fire event -> eventToFrameFactory -> assert frames/components
 *
 * Specs stay pure data; behavior changes in src/ break these tests loudly.
 */
import { Workspace, BlockSvg } from "blockly";
import Blockly from "blockly";
import { expect } from "vitest";

import "@/core/blockly/blocks";
import {
  createTestEvent,
} from "../../app/tests.helper";
import { connectToArduinoBlock } from "@/core/blockly/helpers/block.helper";
import { eventToFrameFactory } from "@/core/frames/event-to-frame.factory";
import { VariableTypes } from "@/core/blockly/dto/variable.type";
import { createValueBlock } from "../../app/tests.helper";
import type { ArduinoFrame } from "@/core/frames/arduino.frame";
import type { Color } from "@/core/frames/arduino.frame";
import { ArduinoComponentType } from "@/core/frames/arduino.frame";

// ---------------------------------------------------------------------------
// Stack building
// ---------------------------------------------------------------------------

/** Shorthand for wiring a value block into an input of a step. */
export type ValueInput =
  | { num: number }
  | { str: string }
  | { bool: boolean }
  | { color: Color }
  /** reference a previously built block (e.g. a variable-get) */
  | { ref: BlockSvg };

export interface StepDef {
  type: string;
  fields?: Record<string, string | number>;
  /** input name -> value block to connect */
  values?: Record<string, ValueInput>;
}

function makeValueBlock(ws: Workspace, input: ValueInput): BlockSvg {
  if ("num" in input) return createValueBlock(ws, VariableTypes.NUMBER, input.num);
  if ("str" in input) return createValueBlock(ws, VariableTypes.STRING, input.str);
  if ("bool" in input) return createValueBlock(ws, VariableTypes.BOOLEAN, input.bool);
  if ("color" in input) return createValueBlock(ws, VariableTypes.COLOUR, input.color);
  return input.ref;
}

/**
 * Builds a stack of blocks attached to the arduino loop block.
 * Steps are given in EXECUTION order (top of stack first); the physical
 * connect happens in reverse so the first step runs first — matching how
 * the simulator walks blocks.
 */
export const stack = (
  ws: Workspace,
  steps: StepDef[],
  _arduinoBlock?: BlockSvg, // kept for call-site readability; connectToArduinoBlock resolves the loop block itself
): BlockSvg[] => {
  const built: BlockSvg[] = [];
  for (const step of steps) {
    const block = ws.newBlock(step.type) as BlockSvg;
    for (const [field, value] of Object.entries(step.fields ?? {})) {
      block.setFieldValue(String(value), field);
    }
    for (const [inputName, inputDef] of Object.entries(step.values ?? {})) {
      block.getInput(inputName)!.connection!.connect(
        makeValueBlock(ws, inputDef).outputConnection!
      );
    }
    built.push(block);
  }
  // Connect in reverse so the first step ends up executing first.
  for (const block of [...built].reverse()) {
    connectToArduinoBlock(block);
  }
  return built;
};

/** Runs the frame factory for the event triggered by the given block. */
export const framesFor = (block: BlockSvg): ArduinoFrame[] =>
  eventToFrameFactory(createTestEvent(block.id)).frames;

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

/** Deep-partial expectation for one component state. */
export interface ComponentExpectation {
  type?: ArduinoComponentType;
  pins?: string[];
  state?: unknown;
  fade?: boolean | null;
  color?: unknown;
  explanation?: string;
  delay?: number;
  sendMessage?: string;
  builtInLedOn?: boolean;
  txLedOn?: boolean;
  powerLedOn?: boolean;
  /** arbitrary field checks on the concrete state object */
  fields?: Record<string, unknown>;
}

export interface FrameExpectation extends ComponentExpectation {
  /** component count shortcut; checked before individual components */
  count?: number;
}

const matchComponent = (
  component: Record<string, any>,
  exp: ComponentExpectation,
) => {
  for (const key of ["type", "pins", "state", "fade", "color"] as const) {
    if (key in exp && exp[key] !== undefined) {
      expect(component[key], `component.${key}`).toEqual(exp[key]);
    }
  }
  for (const [field, value] of Object.entries(exp.fields ?? {})) {
    expect(component[field], `component.${field}`).toEqual(value);
  }
};

/**
 * Asserts a frame against a partial expectation.
 * - `components`: array of partial component states matched by index
 * - `count`: exact component count
 */
export const expectFrame = (
  frame: ArduinoFrame,
  exp: FrameExpectation,
): void => {
  if (exp.count !== undefined) {
    expect(frame.components.length, "frame component count").toBe(exp.count);
  }
  (exp.components ?? []).forEach((compExp, i) => {
    const comp = frame.components[i];
    expect(comp, `frame.components[${i}]`).toBeDefined();
    matchComponent(comp as Record<string, any>, compExp);
  });
  if (exp.explanation !== undefined) {
    expect(frame.explanation).toBe(exp.explanation);
  }
  if (exp.delay !== undefined) expect(frame.delay).toBe(exp.delay);
  if (exp.sendMessage !== undefined)
    expect(frame.sendMessage).toBe(exp.sendMessage);
  if (exp.builtInLedOn !== undefined)
    expect(frame.builtInLedOn).toBe(exp.builtInLedOn);
  if (exp.txLedOn !== undefined) expect(frame.txLedOn).toBe(exp.txLedOn);
  if (exp.powerLedOn !== undefined)
    expect(frame.powerLedOn).toBe(exp.powerLedOn);
};

/** Convenience: assert every frame's nth component with one expectation. */
export const expectAllFrames = (
  frames: ArduinoFrame[],
  exp: FrameExpectation,
): void => {
  expect(frames.length, "frame count").toBeGreaterThan(0);
  frames.forEach((f) => expectFrame(f, exp));
};

// ---------------------------------------------------------------------------
// Code generation
// ---------------------------------------------------------------------------

/**
 * Generates Arduino C++ for exactly the blocks currently in `ws`.
 * Reset setupCode_ between calls so per-pin setup fragments don't leak.
 */
export const generateCode = (ws: Workspace): string => {
   
  const G = Blockly.Arduino as any;
  G.setupCode_ = {};
  return G.workspaceToCode(ws);
};
