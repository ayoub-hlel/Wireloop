import {
  BlockToFrameTransformer,
  generateInputFrame,
} from "../../core/frames/transformer/block-to-frame.transformer";
import { getInputValue } from "../../core/frames/transformer/block-to-value.factories";
import isEmpty from "lodash/isEmpty";
import cloneDeep from "lodash/cloneDeep";
import {
  arduinoFrameByExplanation,
  arduinoFrameByVariable,
} from "../../core/frames/transformer/frame-transformer.helpers";
import { findFieldValue } from "../../core/blockly/helpers/block-data.helper";
import { VariableTypes } from "../../core/blockly/dto/variable.type";
import type { ArduinoFrame, Variable } from "../../core/frames/arduino.frame";

export const simpleLoop: BlockToFrameTransformer = (
  blocks,
  block,
  variables,
  timeline,
  previousState
) => {
  const times = Math.abs(
    getInputValue(blocks, block, variables, timeline, "TIMES", 1, previousState)
  );

  return Array.from({ length: times }, (_, i) => i + 1).reduce<ArduinoFrame[]>((prev, next) => {
    const beforeState = isEmpty(prev) ? previousState : prev[prev.length - 1];

    const loopFrame = arduinoFrameByExplanation(
      block.id,
      block.blockName,
      timeline,
      `Running loop ${next} out of ${times} times.`,
      beforeState
    );

    return [
      ...prev,
      loopFrame,
      ...generateInputFrame(
        block,
        blocks,
        variables,
        timeline,
        "DO",
        loopFrame
      ),
    ];
  }, []);
};

export const forLoop: BlockToFrameTransformer = (
  blocks,
  block,
  variables,
  timeline,
  previousState
) => {
  const from = getInputValue(
    blocks,
    block,
    variables,
    timeline,
    "FROM",
    1,
    previousState
  );

  const to = getInputValue(
    blocks,
    block,
    variables,
    timeline,
    "TO",
    1,
    previousState
  );

  const by = Math.abs(+findFieldValue(block, "BY"));

  const multiplyBy = from > to ? -1 : 1;

  let prevState = previousState;
  // Inclusive of both endpoints; `|to - from| + 1` (not `|to - from + 1|`)
  // so decreasing ranges (from > to) count correctly.
  const loopLength = Math.ceil((Math.abs(to - from) + 1) / by);
  return Array.from({ length: loopLength }, (_, i) => from + i * by * multiplyBy)
    .map((i, counter, array) => {
      const variableData = variables.find(
        (v) => v.id === findFieldValue(block, "VAR")
      );
      if (!variableData) return [];

      const newVariable: Variable = {
        id: variableData.id,
        name: variableData.name,
        value: i,
        type: VariableTypes.NUMBER,
      };
      const loopFrame = arduinoFrameByVariable(
        block.id,
        block.blockName,
        timeline,
        newVariable,
        `Running loop ${counter + 1} out ${array.length} times; ${
          newVariable.name
        } = ${i}`,
        prevState
      );
      const states = [
        loopFrame,
        ...generateInputFrame(
          block,
          blocks,
          variables,
          timeline,
          "DO",
          loopFrame
        ),
      ];
      prevState = cloneDeep(states[states.length - 1]);

      return states;
    })
    .flat(2);
};
