import { getShape, type Shape, type ShapeId } from "./shapes";

export const SHAPE_SEQUENCE = [
  "sphere",
  "torusKnot",
  "galaxy",
  "wave",
  "text",
] as const satisfies readonly ShapeId[];

export const DELAY_MAX = 0.4;
export const MORPH_DURATION_MS = 1800;
export const AUTO_ADVANCE_INTERVAL_MS = 8000;

export type ShapeSequence = {
  currentIndex: number;
  current: Shape;
  next: Shape;
};

export type IdleTransition = {
  phase: "idle";
  progress: 1;
};

export type MorphingTransition = {
  phase: "morphing";
  startedAt: number;
  durationMs: number;
  progress: number;
};

export type MorphTransition = IdleTransition | MorphingTransition;

export type MorphRequestResult = {
  accepted: boolean;
  transition: MorphTransition;
};

export type AutoAdvance = {
  lastInteractionAt: number;
  intervalMs: number;
};

export type AutoAdvanceResult = {
  shouldAdvance: boolean;
  autoAdvance: AutoAdvance;
};

function normalizeIndex(index: number): number {
  const length = SHAPE_SEQUENCE.length;
  return ((Math.floor(index) % length) + length) % length;
}

function shapeAt(index: number): Shape {
  return getShape(SHAPE_SEQUENCE[normalizeIndex(index)]);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function easeInOut(progress: number): number {
  return progress * progress * (3 - 2 * progress);
}

export function createShapeSequence(currentIndex = 0): ShapeSequence {
  const normalized = normalizeIndex(currentIndex);
  return {
    currentIndex: normalized,
    current: shapeAt(normalized),
    next: shapeAt(normalized + 1),
  };
}

export function advanceShapeSequence(sequence: ShapeSequence): ShapeSequence {
  return createShapeSequence(sequence.currentIndex + 1);
}

export function createIdleTransition(): IdleTransition {
  return {
    phase: "idle",
    progress: 1,
  };
}

export function createMorphTransition(
  startedAt: number,
  durationMs = MORPH_DURATION_MS,
): MorphingTransition {
  return {
    phase: "morphing",
    startedAt,
    durationMs,
    progress: 0,
  };
}

export function getEasedMorphProgress(
  transition: MorphingTransition,
  now: number,
): number {
  const linear = clamp01((now - transition.startedAt) / transition.durationMs);
  return easeInOut(linear);
}

export function getParticleProgress(progress: number, delay: number): number {
  const safeDelay = Math.min(DELAY_MAX, Math.max(0, delay));
  return clamp01((progress - safeDelay) / (1 - DELAY_MAX));
}

export function requestMorph(
  transition: MorphTransition,
  now: number,
): MorphRequestResult {
  if (transition.phase === "morphing") {
    return {
      accepted: false,
      transition,
    };
  }

  return {
    accepted: true,
    transition: createMorphTransition(now),
  };
}

export function updateMorphTransition(
  transition: MorphTransition,
  now: number,
): MorphTransition {
  if (transition.phase === "idle") {
    return transition;
  }

  const progress = getEasedMorphProgress(transition, now);
  if (progress >= 1) {
    return createIdleTransition();
  }

  return {
    ...transition,
    progress,
  };
}

export function createAutoAdvance(
  lastInteractionAt: number,
  intervalMs = AUTO_ADVANCE_INTERVAL_MS,
): AutoAdvance {
  return {
    lastInteractionAt,
    intervalMs,
  };
}

export function recordInteraction(
  autoAdvance: AutoAdvance,
  now: number,
): AutoAdvance {
  return {
    ...autoAdvance,
    lastInteractionAt: now,
  };
}

export function evaluateAutoAdvance(
  autoAdvance: AutoAdvance,
  transition: MorphTransition,
  now: number,
  reducedMotion = false,
): AutoAdvanceResult {
  if (
    reducedMotion ||
    transition.phase !== "idle" ||
    now - autoAdvance.lastInteractionAt < autoAdvance.intervalMs
  ) {
    return {
      shouldAdvance: false,
      autoAdvance,
    };
  }

  return {
    shouldAdvance: true,
    autoAdvance: recordInteraction(autoAdvance, now),
  };
}
