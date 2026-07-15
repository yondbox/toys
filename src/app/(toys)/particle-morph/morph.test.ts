import { describe, expect, it } from "vitest";
import {
  AUTO_ADVANCE_INTERVAL_MS,
  advanceShapeSequence,
  createAutoAdvance,
  createIdleTransition,
  createMorphTransition,
  createShapeSequence,
  DELAY_MAX,
  evaluateAutoAdvance,
  getEasedMorphProgress,
  getParticleProgress,
  recordInteraction,
  requestMorph,
  SHAPE_SEQUENCE,
} from "./morph";

describe("ShapeSequence", () => {
  it("cycles through the fixed shape order and wraps to the first shape", () => {
    let sequence = createShapeSequence();
    const visited = [sequence.current.id];

    for (let index = 0; index < SHAPE_SEQUENCE.length; index++) {
      sequence = advanceShapeSequence(sequence);
      visited.push(sequence.current.id);
    }

    expect(visited).toEqual([
      "sphere",
      "torusKnot",
      "galaxy",
      "wave",
      "text",
      "sphere",
    ]);
  });
});

describe("MorphTransition", () => {
  it("keeps eased progress in range and monotonic", () => {
    const transition = createMorphTransition(1000);
    const samples = [1000, 1250, 1500, 1750, 2000, 2500, 4000].map((now) =>
      getEasedMorphProgress(transition, now),
    );

    expect(samples[0]).toBe(0);
    expect(samples.at(-1)).toBe(1);
    for (const progress of samples) {
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    }
    for (let index = 1; index < samples.length; index++) {
      expect(samples[index]).toBeGreaterThanOrEqual(samples[index - 1]);
    }
  });

  it("finishes every staggered particle when global progress is 1", () => {
    for (const delay of [0, DELAY_MAX / 2, DELAY_MAX]) {
      expect(getParticleProgress(1, delay)).toBe(1);
    }
  });

  it("ignores morph requests while already morphing", () => {
    const active = createMorphTransition(500);

    expect(requestMorph(active, 800)).toEqual({
      accepted: false,
      transition: active,
    });
  });
});

describe("AutoAdvance", () => {
  it("exposes the required idle interval", () => {
    expect(AUTO_ADVANCE_INTERVAL_MS).toBe(8000);
  });

  it("fires only while idle after the required elapsed time", () => {
    const autoAdvance = createAutoAdvance(1000);

    expect(
      evaluateAutoAdvance(autoAdvance, createIdleTransition(), 8999)
        .shouldAdvance,
    ).toBe(false);
    expect(
      evaluateAutoAdvance(autoAdvance, createIdleTransition(), 9000)
        .shouldAdvance,
    ).toBe(true);
    expect(
      evaluateAutoAdvance(autoAdvance, createMorphTransition(8500), 10_000)
        .shouldAdvance,
    ).toBe(false);
  });

  it("records interactions as the new idle baseline", () => {
    const autoAdvance = recordInteraction(createAutoAdvance(0), 5000);

    expect(autoAdvance.lastInteractionAt).toBe(5000);
    expect(
      evaluateAutoAdvance(autoAdvance, createIdleTransition(), 12_999)
        .shouldAdvance,
    ).toBe(false);
    expect(
      evaluateAutoAdvance(autoAdvance, createIdleTransition(), 13_000)
        .shouldAdvance,
    ).toBe(true);
  });

  it("moves the timestamp forward when auto-advance fires", () => {
    const first = evaluateAutoAdvance(
      createAutoAdvance(0),
      createIdleTransition(),
      8000,
    );

    expect(first.shouldAdvance).toBe(true);
    expect(first.autoAdvance.lastInteractionAt).toBe(8000);
    expect(
      evaluateAutoAdvance(first.autoAdvance, createIdleTransition(), 8000)
        .shouldAdvance,
    ).toBe(false);
  });
});
