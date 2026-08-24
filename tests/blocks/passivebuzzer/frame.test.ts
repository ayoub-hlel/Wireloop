/**
 * Passive buzzer regression — rewritten as data-driven specs (see _harness).
 * Every assertion from the original frame.test.ts is preserved.
 */
import { describe, it, beforeEach, afterEach, expect } from "vitest";
import type { Workspace, BlockSvg } from "blockly";

import "@/core/blockly/blocks";
import {
  createArduinoAndWorkSpace,
} from "../../app/tests.helper";
import {
  stack,
  framesFor,
  expectFrame,
} from "../_harness/block.harness";
import { ArduinoComponentType } from "@/core/frames/arduino.frame";
import { ARDUINO_PINS } from "@/core/microcontroller/selectBoard";
import { NOTE_TONES, Notes } from "@/blocks/passivebuzzer/state";

const tone = (value: number | string) => String(value);

describe("passive buzzer blocks", () => {
  let ws: Workspace;
  let arduino: BlockSvg;

  beforeEach(() => {
    [ws, arduino] = createArduinoAndWorkSpace();
    arduino.setFieldValue("1", "LOOP_TIMES");
  });
  afterEach(() => {
    ws.dispose();
  });

  const expectedToneExplanation = (pin: string, toneValue: number) =>
    toneValue !== 0
      ? `Setting passive buzzer ${pin} to play tone ${Notes[toneValue] ?? toneValue}.`
      : `Turning off passive buzzer ${pin}.`;

  it("tone block then note blocks turn one buzzer on and off", () => {
    const [block1] = stack(
      ws,
      [
        {
          type: "passive_buzzer_tone",
          fields: { PIN: ARDUINO_PINS.PIN_3 },
          values: { TONE: { num: 33 } },
        },
        {
          type: "passive_buzzer_note",
          fields: { PIN: ARDUINO_PINS.PIN_3, TONE: tone(NOTE_TONES.NO_TONE) },
        },
        {
          type: "passive_buzzer_note",
          fields: { PIN: ARDUINO_PINS.PIN_3, TONE: tone(NOTE_TONES.C) },
        },
      ],
      arduino,
    );
    const frames = framesFor(block1);
    expect(frames.length).toBe(3);

    [33, 0, NOTE_TONES.C].forEach((expectedTone, i) => {
      expectFrame(frames[i], {
        count: 1,
        components: [
          {
            type: ArduinoComponentType.PASSIVE_BUZZER,
            pins: [ARDUINO_PINS.PIN_3],
            fields: { tone: expectedTone },
          },
        ],
        explanation: expectedToneExplanation(ARDUINO_PINS.PIN_3, expectedTone),
      });
    });
  });

  it("multiple buzzers keep independent tones per pin", () => {
    const [block1] = stack(
      ws,
      [
        {
          type: "passive_buzzer_note",
          fields: { PIN: ARDUINO_PINS.PIN_4, TONE: tone(NOTE_TONES["A#"]) },
        },
        {
          type: "passive_buzzer_note",
          fields: { PIN: ARDUINO_PINS.PIN_3, TONE: tone(NOTE_TONES.B) },
        },
        {
          type: "passive_buzzer_note",
          fields: { PIN: ARDUINO_PINS.PIN_4, TONE: tone(NOTE_TONES.NO_TONE) },
        },
      ],
      arduino,
    );
    const [frame1, frame2, frame3] = framesFor(block1);
    expect(frame1.components.length).toBe(1);
    expectFrame(frame1, {
      count: 1,
      components: [
        {
          type: ArduinoComponentType.PASSIVE_BUZZER,
          pins: [ARDUINO_PINS.PIN_4],
          fields: { tone: NOTE_TONES["A#"] },
        },
      ],
      explanation: expectedToneExplanation(
        ARDUINO_PINS.PIN_4,
        NOTE_TONES["A#"]
      ),
    });

    // Frames 2 and 3 carry both buzzers; find each by pin like the original.
    [frame2, frame3].forEach((frame, i) => {
      expect(frame.components.length).toBe(2);
      const pin4 = frame.components.find(
        (c) => c.pins[0] === ARDUINO_PINS.PIN_4
      );
      const pin3 = frame.components.find(
        (c) => c.pins[0] === ARDUINO_PINS.PIN_3
      );
      expect(pin4).toBeDefined();
      expect(pin3).toBeDefined();
      expect((pin4 as any).type).toBe(ArduinoComponentType.PASSIVE_BUZZER);
      expect((pin3 as any).type).toBe(ArduinoComponentType.PASSIVE_BUZZER);
      expect((pin4 as any).tone).toBe(
        i === 0 ? NOTE_TONES["A#"] : NOTE_TONES.NO_TONE
      );
      expect((pin3 as any).tone).toBe(NOTE_TONES.B);
    });
  });
});
