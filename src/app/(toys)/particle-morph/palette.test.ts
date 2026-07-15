import { describe, expect, it } from "vitest";
import { resolvePalette } from "./palette";

describe("resolvePalette", () => {
  it("resolves the dark space palette with additive glow", () => {
    expect(resolvePalette("dark")).toEqual({
      background: "#02030a",
      colorInner: "#ffffff",
      colorOuter: "#67e8f9",
      blending: "additive",
    });
  });

  it("resolves the light palette with normal blending and darker particles", () => {
    expect(resolvePalette("light")).toEqual({
      background: "#f3efe4",
      colorInner: "#0f172a",
      colorOuter: "#0e7490",
      blending: "normal",
    });
  });
});
