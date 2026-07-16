import { describe, expect, it } from "vitest";
import {
  BOUNDING_RADIUS,
  generateSphereShape,
  generateTextShape,
  SHAPES,
} from "./shapes";

/**
 * 生成済み座標が共有 bounding radius を超えていないことを検証する。
 *
 * @param positions - x/y/z が 3 要素単位で並ぶ座標配列。
 */
function expectWithinBoundingRadius(positions: Float32Array) {
  for (let index = 0; index < positions.length; index += 3) {
    const radius = Math.hypot(
      positions[index],
      positions[index + 1],
      positions[index + 2],
    );
    expect(radius).toBeLessThanOrEqual(BOUNDING_RADIUS + 0.0001);
  }
}

describe("shape generators", () => {
  it("return x/y/z coordinates for every particle", () => {
    for (const shape of SHAPES) {
      expect(shape.generate(128, 1)).toHaveLength(128 * 3);
    }
  });

  it("keep every particle inside the shared bounding radius", () => {
    for (const shape of SHAPES) {
      expectWithinBoundingRadius(shape.generate(512, 2));
    }
  });

  it("are deterministic for the same count and seed", () => {
    for (const shape of SHAPES) {
      expect(Array.from(shape.generate(256, 123))).toEqual(
        Array.from(shape.generate(256, 123)),
      );
    }
  });

  it("falls back to the sphere layout when Canvas 2D is unavailable", () => {
    expect(
      Array.from(
        generateTextShape(180, 99, {
          createCanvas: () => null,
        }),
      ),
    ).toEqual(Array.from(generateSphereShape(180, 99)));
  });
});
