/**
 * List block regression — rewritten against the shared harness conventions
 * (see _harness/block.harness.ts and led/blocktoframe.test.ts).
 *
 * List setups are pre-setup-phase blocks and list writes are chained
 * statement blocks, so the declarative `stack()` helper does not apply here;
 * the raw tests.helper primitives are used instead. Every assertion from the
 * original bespoke tests (list-setup / list-get-item / list-set-items) is
 * preserved verbatim in translated form.
 */
import { describe, it, beforeEach, afterEach, expect } from "vitest";

import "@/core/blockly/blocks";
import "../../app/fake-block";
import type { Workspace, BlockSvg } from "blockly";
import _ from "lodash";

import {
  createArduinoAndWorkSpace,
  createValueBlock,
  createSetVariableBlockWithValue,
  createGetVariable,
  createListSetupBlock,
  createSetListBlock,
  createTestEvent,
} from "../../app/tests.helper";
import { VariableTypes } from "@/core/blockly/dto/variable.type";
import { connectToArduinoBlock } from "@/core/blockly/helpers/block.helper";
import { eventToFrameFactory } from "@/core/frames/event-to-frame.factory";
import type { Color, Variable } from "@/core/frames/arduino.frame";

describe("list blocks", () => {
  let workspace: Workspace;
  let arduinoBlock: BlockSvg;

  beforeEach(() => {
    [workspace, arduinoBlock] = createArduinoAndWorkSpace();
  });
  afterEach(() => {
    workspace.dispose();
  });

  // -------------------------------------------------------------------------
  // list create (pre-setup)
  // -------------------------------------------------------------------------

  it("create blocks generate one state per list with cumulative variables", () => {
    const numListBlock = createListSetupBlock(
      workspace,
      "nums",
      VariableTypes.LIST_NUMBER,
      10
    );
    createListSetupBlock(workspace, "texts", VariableTypes.LIST_STRING, 8);
    createListSetupBlock(workspace, "bools", VariableTypes.LIST_BOOLEAN, 6);
    createListSetupBlock(workspace, "colors", VariableTypes.LIST_COLOUR, 4);

    const states = eventToFrameFactory(createTestEvent(numListBlock.id)).frames;
    expect(states.length).toEqual(4);
    const [state1, state2, state3, state4] = states;
    const actualExplanation = states.map((s) => s.explanation).sort();
    const expectedExplanations = [
      'Creating a number list variable named "nums" that stores 10 items.',
      'Creating a text list variable named "texts" that stores 8 items.',
      'Creating a boolean list variable named "bools" that stores 6 items.',
      'Creating a color list variable named "colors" that stores 4 items.',
    ].sort();
    expect(actualExplanation).toEqual(expectedExplanations);
    expect(_.keys(state1.variables).length).toBe(1);
    expect(_.keys(state2.variables).length).toBe(2);
    expect(_.keys(state3.variables).length).toBe(3);
    expect(_.keys(state4.variables).length).toBe(4);

    verifyListSetupVariable(
      "nums",
      VariableTypes.LIST_NUMBER,
      10,
      state4.variables
    );
    verifyListSetupVariable(
      "texts",
      VariableTypes.LIST_STRING,
      8,
      state4.variables
    );
    verifyListSetupVariable(
      "bools",
      VariableTypes.LIST_BOOLEAN,
      6,
      state4.variables
    );
    verifyListSetupVariable(
      "colors",
      VariableTypes.LIST_COLOUR,
      4,
      state4.variables
    );
  });

  const verifyListSetupVariable = (
    name: string,
    type: VariableTypes,
    size: number,
    variables: { [variableName: string]: Variable }
  ) => {
    const variable = variables[name];
    expect(variable.type).toBe(type);
    expect(variable.name).toBe(name);
    expect(variable.id).toBeDefined();
    expect(variable.value).toEqual([..._.range(0, size).map(() => null)]);
  };

  // -------------------------------------------------------------------------
  // get item from list
  // -------------------------------------------------------------------------

  it("gets items in a number list", () => {
    testGetItemsInList(
      VariableTypes.LIST_NUMBER,
      VariableTypes.NUMBER,
      0,
      33,
      44
    );
  });

  it("gets items in a string list", () => {
    testGetItemsInList(
      VariableTypes.LIST_STRING,
      VariableTypes.STRING,
      "",
      "tim",
      "amy"
    );
  });

  it("gets items in a booleans list", () => {
    testGetItemsInList(
      VariableTypes.LIST_BOOLEAN,
      VariableTypes.BOOLEAN,
      false,
      true,
      false
    );
  });

  it("gets items in a colours list", () => {
    testGetItemsInList(
      VariableTypes.LIST_COLOUR,
      VariableTypes.COLOUR,
      { red: 0, green: 0, blue: 0 },
      { red: 120, green: 0, blue: 120 },
      { red: 100, green: 200, blue: 0 }
    );
  });

  const testGetItemsInList = (
    type: VariableTypes,
    valueBlockType: VariableTypes,
    defaultValue: string | number | boolean | Color,
    valueBlock1Value: string | number | boolean | Color,
    valueBlock3Value: string | number | boolean | Color
  ) => {
    arduinoBlock.setFieldValue("1", "LOOP_TIMES");

    const listBlockSetup = createListSetupBlock(workspace, "list", type, 3);
    const listVariableId = listBlockSetup.getFieldValue("VAR");
    const valueBlock1 = createValueBlock(
      workspace,
      valueBlockType,
      valueBlock1Value
    );
    const valueBlock2 = createValueBlock(
      workspace,
      valueBlockType,
      valueBlock3Value
    );

    const numberBlock1 = workspace.newBlock("math_number") as BlockSvg;
    numberBlock1.setFieldValue("1", "NUM");

    const numberBlock3 = workspace.newBlock("math_number") as BlockSvg;
    numberBlock3.setFieldValue("3", "NUM");

    const listSetPosition1 = createSetListBlock(
      workspace,
      listBlockSetup.getFieldValue("VAR"),
      type,
      numberBlock1,
      valueBlock1
    );

    const listSetPosition2 = createSetListBlock(
      workspace,
      listBlockSetup.getFieldValue("VAR"),
      type,
      numberBlock3,
      valueBlock2
    );

    const setListItemVariable = createSetVariableBlockWithListItemAttached(
      valueBlockType,
      listVariableId,
      -1,
      defaultValue
    );

    const setListItemVariable1 = createSetVariableBlockWithListItemAttached(
      valueBlockType,
      listVariableId,
      0,
      defaultValue
    );

    const setListItemVariable2 = createSetVariableBlockWithListItemAttached(
      valueBlockType,
      listVariableId,
      1,
      defaultValue
    );

    const setListItemVariable3 = createSetVariableBlockWithListItemAttached(
      valueBlockType,
      listVariableId,
      2,
      defaultValue
    );

    const setListItemVariable4 = createSetVariableBlockWithListItemAttached(
      valueBlockType,
      listVariableId,
      3,
      defaultValue
    );

    const setListItemVariable20 = createSetVariableBlockWithListItemAttached(
      valueBlockType,
      listVariableId,
      20,
      defaultValue
    );

    connectToArduinoBlock(listSetPosition1);
    listSetPosition1.nextConnection!.connect(listSetPosition2.previousConnection!);
    listSetPosition2.nextConnection!.connect(
      setListItemVariable.previousConnection!);
    setListItemVariable.nextConnection!.connect(
      setListItemVariable1.previousConnection!);
    setListItemVariable1.nextConnection!.connect(
      setListItemVariable2.previousConnection!);
    setListItemVariable2.nextConnection!.connect(
      setListItemVariable3.previousConnection!);
    setListItemVariable3.nextConnection!.connect(
      setListItemVariable4.previousConnection!);
    setListItemVariable4.nextConnection!.connect(
      setListItemVariable20.previousConnection!);

    const [
      state1,
      state2,
      ,
      state4,
      state5,
      state6,
      state7,
      state8,
      state9,
      ,
    ] = eventToFrameFactory(createTestEvent(setListItemVariable4.id)).frames;

    // Testing variables are not being creating
    expect(_.keys(state1.variables).length).toBe(1);
    expect(_.keys(state2.variables).length).toBe(1);

    // Testing that a negative blocks sets
    expect(state4.variables["var1_-1"].value).toEqual(valueBlock1Value);
    expect(_.keys(state4.variables).length).toBe(2);

    // testing that 0 returns first element
    expect(state5.variables["var1_0"].value).toEqual(valueBlock1Value);
    expect(_.keys(state5.variables).length).toBe(3);

    // testing 1 returns the first element
    expect(state6.variables["var1_1"].value).toEqual(valueBlock1Value);
    expect(_.keys(state6.variables).length).toBe(4);

    // testing 2 returns the second element
    expect(state7.variables["var1_2"].value).toBeNull();
    expect(_.keys(state7.variables).length).toBe(5);

    // Testing if no element is the stop that it will return null
    expect(state8.variables["var1_3"].value).toEqual(valueBlock3Value);
    expect(_.keys(state8.variables).length).toBe(6);

    // Testing if the number is out of range will use the last element which is not set so it should be null
    expect(state9.variables["var1_20"].value).toEqual(valueBlock3Value);
    expect(_.keys(state9.variables).length).toBe(7);
  };

  const createSetVariableBlockWithListItemAttached = (
    type: VariableTypes,
    listVariableId: string,
    position: number,
    defaultValue: string | number | boolean | Color
  ) => {
    const variableBlock = createSetVariableBlockWithValue(
      workspace,
      "var1_" + position,
      type,
      defaultValue
    );

    const getItemInListBlock = createGetListItemBlock(
      type,
      listVariableId,
      position
    );

    variableBlock.getInput("VALUE")!.connection!.targetBlock()!.dispose(true);

    variableBlock
      .getInput("VALUE")!.connection!.connect(getItemInListBlock.outputConnection!);

    return variableBlock;
  };

  const createGetListItemBlock = (
    type: VariableTypes,
    listVariableId: string,
    position: number
  ) => {
    const block = workspace.newBlock(toArrayBlockType(type)!);
    block.setFieldValue(listVariableId!, "VAR");
    const positionBlock = createValueBlock(
      workspace,
      VariableTypes.NUMBER,
      position
    );
    block.getInput("POSITION")!.connection!.connect(positionBlock.outputConnection!);

    return block;
  };

  const toArrayBlockType = (type: VariableTypes) => {
    switch (type) {
      case VariableTypes.COLOUR:
        return "get_colour_from_list";
      case VariableTypes.BOOLEAN:
        return "get_boolean_from_list";
      case VariableTypes.NUMBER:
        return "get_number_from_list";
      case VariableTypes.STRING:
        return "get_string_from_list";
    }
  };

  // -------------------------------------------------------------------------
  // set item into list
  // -------------------------------------------------------------------------

  it("sets values in a string list", () => {
    testSetListBlock(
      VariableTypes.LIST_STRING,
      VariableTypes.STRING,
      "",
      "fred",
      "amy",
      "joe"
    );
  });

  it("sets values in a boolean list", () => {
    testSetListBlock(
      VariableTypes.LIST_BOOLEAN,
      VariableTypes.BOOLEAN,
      false,
      true,
      false,
      true
    );
  });

  it("sets values in a color list", () => {
    testSetListBlock(
      VariableTypes.LIST_COLOUR,
      VariableTypes.COLOUR,
      { red: 0, green: 0, blue: 0 },
      { red: 170, green: 0, blue: 170 },
      { red: 0, green: 170, blue: 170 },
      { red: 132, green: 10, blue: 170 }
    );
  });

  it("sets values in a numbers list", () => {
    testSetListBlock(
      VariableTypes.LIST_NUMBER,
      VariableTypes.NUMBER,
      0,
      134,
      23,
      454
    );
  });

  const testSetListBlock = (
    type: VariableTypes,
    valueBlockType: VariableTypes,
    defaultValue: string | number | boolean | Color,
    valueBlock1Value: string | number | boolean | Color,
    valueBlock2Value: string | number | boolean | Color,
    setVariableBlockValue: string | number | boolean | Color
  ) => {
    const setVariableBlock = createSetVariableBlockWithValue(
      workspace,
      "get_value",
      valueBlockType,
      setVariableBlockValue
    );

    const valueBlock1 = createValueBlock(
      workspace,
      valueBlockType,
      valueBlock1Value
    );
    const valueBlock2 = createValueBlock(
      workspace,
      valueBlockType,
      valueBlock2Value
    );

    const listBlockSetup = createListSetupBlock(workspace, "list", type, 3);

    const numberBlock = workspace.newBlock("math_number") as BlockSvg;
    numberBlock.setFieldValue("1", "NUM");

    const numberBlockStore2 = workspace.newBlock("math_number") as BlockSvg;
    numberBlockStore2.setFieldValue("2", "NUM");

    const numberBlockTooLarge = workspace.newBlock("math_number") as BlockSvg;
    numberBlockTooLarge.setFieldValue("20", "NUM");

    const getVariable1 = createGetVariable(
      setVariableBlock,
      workspace
    ) as BlockSvg;

    const getVariable2 = createGetVariable(
      setVariableBlock,
      workspace
    ) as BlockSvg;

    const setListPosition1 = createSetListBlock(
      workspace,
      listBlockSetup.getFieldValue("VAR"),
      type,
      numberBlock,
      valueBlock1
    );

    const setListPosition2 = createSetListBlock(
      workspace,
      listBlockSetup.getFieldValue("VAR"),
      type,
      numberBlock,
      getVariable1
    );

    const setListPosition3 = workspace.newBlock(
      setListPosition2.type
    ) as BlockSvg;
    setListPosition3.setFieldValue(setListPosition2.getFieldValue("VAR"), "VAR");
    setListPosition2.nextConnection.connect(setListPosition3.previousConnection);

    const setListPosition4 = createSetListBlock(
      workspace,
      setListPosition2.getFieldValue("VAR"),
      type,
      numberBlockTooLarge,
      getVariable2
    );

    const setListPosition5 = createSetListBlock(
      workspace,
      setListPosition2.getFieldValue("VAR"),
      type,
      numberBlockStore2,
      valueBlock2
    );

    connectToArduinoBlock(setListPosition5);
    connectToArduinoBlock(setListPosition4);
    connectToArduinoBlock(setListPosition3);
    connectToArduinoBlock(setListPosition2);
    connectToArduinoBlock(setListPosition1);
    connectToArduinoBlock(setVariableBlock);

    const [, , state3, state4, state5, state6, state7] =
      eventToFrameFactory(createTestEvent(numberBlock.id)).frames;

    expect(state3.variables["list"].value).toEqual([
      valueBlock1Value,
      null,
      null,
    ]);
    expect(state3.explanation).toBe(
      `List "list" stores ${transformValueToString(
        valueBlock1Value,
        type
      )} at position 1.`
    );

    // Testing that it can over write a variable
    expect(state4.variables["list"].value).toEqual([
      setVariableBlockValue,
      null,
      null,
    ]);
    expect(state4.explanation).toBe(
      `List "list" stores ${transformValueToString(
        setVariableBlockValue,
        type
      )} at position 1.`
    );

    // Testing that a blank block produce an empty string
    expect(state5.explanation).toBe(
      `List "list" stores ${transformValueToString(
        defaultValue,
        type
      )} at position 1.`
    );
    expect(state5.variables["list"].value).toEqual([defaultValue, null, null]);

    // Testing that a position is too large it populates the last one
    expect(state6.explanation).toBe(
      `List "list" stores ${transformValueToString(
        setVariableBlockValue,
        type
      )} at position 3.`
    );
    expect(state6.variables["list"].value).toEqual([
      defaultValue,
      null,
      setVariableBlockValue,
    ]);

    expect(state7.explanation).toBe(
      `List "list" stores ${transformValueToString(
        valueBlock2Value,
        type
      )} at position 2.`
    );
    expect(state7.variables["list"].value).toEqual([
      defaultValue,
      valueBlock2Value,
      setVariableBlockValue,
    ]);
  };

  const transformValueToString = (value: string | Color, listType: VariableTypes) => {
    if (listType === VariableTypes.LIST_COLOUR) {
      return `(red=${value.red},green=${value.green},blue=${value.blue})`;
    }

    if (listType === VariableTypes.LIST_STRING) {
      return `"${value}"`;
    }

    return value;
  };
});
