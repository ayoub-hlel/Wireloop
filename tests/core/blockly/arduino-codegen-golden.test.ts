/**
 * Golden codegen regression for EVERY registered block.
 *
 * For each block type defined in Blockly.Blocks:
 *   - instantiate with default field values (+ fresh variables for VAR fields)
 *   - run the real Arduino code generator
 *
 * Generated C++ is compared against tests/core/blockly/arduino-codegen.golden.json.
 * Any future change that alters emitted code for ANY block fails here until
 * reviewed — this is the safety net for everything that gets flashed to hardware.
 *
 * Blocks intentionally lacking a generator live in GENERATOR_NO_CODE below.
 * The set-equality check means: register a new block without wiring a
 * generator or declaring it here -> red build.
 *
 * Regenerate fixture after an INTENTIONAL codegen change:
 *   UPDATE_GOLDEN=1 npx vitest run tests/core/blockly/arduino-codegen-golden.test.ts
 */
import { describe, it, expect } from "vitest";
import Blockly from "blockly";
import { vi } from "vitest";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { Workspace, BlockSvg } from "blockly";

import * as workspaceHelper from "@/core/blockly/helpers/workspace.helper";
import "@/core/blockly/blocks";
import "@/core/blockly/generators";

 
const B: any = Blockly;

const GOLDEN_PATH = resolve(__dirname, "arduino-codegen.golden.json");

/**
 * Stock Blockly blocks present in Blockly.Blocks with NO Arduino generator.
 * Dragging one of these onto the canvas produces a codegen error at export
 * time by design of the upstream toolbox definitions. Locked as a contract:
 * if this list shrinks/grows unexpectedly this test goes red so someone has
 * to consciously decide (wire up a generator, or hide it from the toolbox).
 */
const GENERATOR_NO_CODE = [
  "controls_if",
  "controls_if_elseif",
  "controls_if_else",
  "controls_if_if",
  "controls_repeat",
  "controls_forEach",
  "logic_null",
  "logic_ternary",
  "colour_picker",
  "colour_blend",
  "lists_create_empty",
  "lists_create_with",
  "lists_create_with_container",
  "lists_create_with_item",
  "lists_repeat",
  "lists_reverse",
  "lists_isEmpty",
  "lists_length",
  "lists_indexOf",
  "lists_getIndex",
  "lists_setIndex",
  "lists_getSublist",
  "lists_sort",
  "lists_split",
  "math_single",
  "math_trig",
  "math_constant",
  "math_change",
  "math_on_list",
  "math_constrain",
  "math_random_float",
  "math_atan2",
  "math_number_property",
  "text",
  "text_multiline",
  "text_join",
  "text_create_join_container",
  "text_create_join_item",
  "text_append",
  "text_length",
  "text_isEmpty",
  "text_indexOf",
  "text_charAt",
  "text_getSubstring",
  "text_changeCase",
  "text_trim",
  "text_print",
  "text_prompt_ext",
  "text_prompt",
  "text_count",
  "text_replace",
  "text_reverse",
  "string_to_number",
  "procedures_defreturn",
  "procedures_mutatorcontainer",
  "procedures_mutatorarg",
  "procedures_callnoreturn",
  "procedures_callreturn",
  "procedures_ifreturn",
  "variables_get",
  "variables_set",
  "variables_get_dynamic",
  "variables_set_dynamic",
];

/** Block types whose generators need a variable context / special fields. */
const FIELD_OVERRIDES: Record<
  string,
  Record<string, string | number>
> = {
  // e.g. controls_for defaults work once a VAR model exists (created generically below)
};

interface GenerateResult {
  code?: string;
  error?: string;
}

// Assigns deterministic ids so generated output (which embeds block.id in
// comments) is stable across runs.
const makeIdsDeterministic = (ws: Workspace): void => {
  ws.getAllBlocks().forEach((b, i) => {
     
    (b as any).id = `${(b as any).type}_${i}`;
  });
};

const generateForBlockType = (type: string): GenerateResult => {
  const ws = new Workspace();
  // Generators reach the workspace two ways: our helper and Blockly.getMainWorkspace().
  const spy = vi
    .spyOn(workspaceHelper, "getWorkspace")
     
    .mockReturnValue(ws as any);
  const mainSpy = vi
     
    .spyOn(Blockly as any, "getMainWorkspace")
     
    .mockReturnValue(ws as any);
  try {
    const block = ws.newBlock(type) as BlockSvg;
    // Give every FieldVariable a real backing model so generators can resolve ids.
    for (const input of block.inputList ?? []) {
      for (const field of input.fieldRow ?? []) {
         
        if (field instanceof B.FieldVariable && field.name) {
          const vm = ws.createVariable(`v_${type}_${field.name}`);
          block.setFieldValue(vm.getId(), field.name);
        }
      }
    }
    // Remove the auto-created shadow getter blocks createVariable adds.
    ws.getTopBlocks().forEach((b) => {
      if ((b as BlockSvg).type.startsWith("variables_get")) b.dispose(false);
    });
    const overrides = FIELD_OVERRIDES[type];
    if (overrides) {
      for (const [field, value] of Object.entries(overrides)) {
        block.setFieldValue(String(value), field);
      }
    }
    makeIdsDeterministic(ws);
    B.Arduino.setupCode_ = {};
    const code: string = B.Arduino.workspaceToCode(ws);
    return { code };
  } catch (e) {
    return { error: (e as Error).message.split("\n")[0] };
  } finally {
    spy.mockRestore();
    mainSpy.mockRestore();
    ws.dispose();
  }
};

describe("Arduino codegen golden coverage", () => {
  it("every registered block either generates code or is declared generator-free", () => {
    const types: string[] = Object.keys(B.Blocks).filter(
      (t: string) => !t.startsWith("procedures_mutator"),
    );
    const unaccounted: string[] = [];
    for (const type of types) {
      if (GENERATOR_NO_CODE.includes(type)) continue;
      const result = generateForBlockType(type);
      if (result.error || !result.code || result.code.trim().length === 0) {
        unaccounted.push(
          `${type}: ${result.error ?? "generated empty code"}`,
        );
      }
    }
    expect(unaccounted, "blocks without working codegen").toEqual([]);
  });

  it("declared generator-free blocks still exist in the registry", () => {
    const stale = GENERATOR_NO_CODE.filter((t) => !(t in B.Blocks));
    expect(stale, "stale entries in GENERATOR_NO_CODE").toEqual([]);
  });

  it("generated code matches the golden fixture", () => {
    const goldenPath = GOLDEN_PATH;
    let golden: Record<string, string> = {};
    try {
      golden = JSON.parse(readFileSync(goldenPath, "utf-8"));
    } catch {
      // first run — will be created below
    }

    const types: string[] = Object.keys(B.Blocks).filter(
      (t: string) =>
        !GENERATOR_NO_CODE.includes(t) && !t.startsWith("procedures_mutator"),
    );

    const current: Record<string, string> = {};
    for (const type of types.sort()) {
      const { code } = generateForBlockType(type);
      if (code !== undefined) current[type] = code;
    }

    if (process.env.UPDATE_GOLDEN) {
      writeFileSync(goldenPath, JSON.stringify(current, null, 2));
      console.log(
        `Golden updated: ${Object.keys(current).length} block types written.`,
      );
      return;
    }

    expect(Object.keys(golden).length, "golden fixture is empty — run with UPDATE_GOLDEN=1").toBeGreaterThan(0);

    const diffs: string[] = [];
    for (const [type, code] of Object.entries(current)) {
      if (!(type in golden)) {
        diffs.push(`${type}: NEW block not in golden — review its generated code, then UPDATE_GOLDEN=1`);
      } else if (golden[type] !== code) {
        diffs.push(`${type}: generated code changed`);
      }
    }
    for (const type of Object.keys(golden)) {
      if (!(type in current)) {
        diffs.push(`${type}: removed from registry but still in golden`);
      }
    }
    expect(diffs, "codegen drift").toEqual([]);
  });
});
