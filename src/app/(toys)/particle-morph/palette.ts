import type { Theme } from "@/lib/theme";

export type ParticlePalette = {
  background: string;
  colorInner: string;
  colorOuter: string;
  blending: "additive" | "normal";
};

const PALETTES: Record<Theme, ParticlePalette> = {
  dark: {
    background: "#02030a",
    colorInner: "#ffffff",
    colorOuter: "#67e8f9",
    blending: "additive",
  },
  light: {
    background: "#f3efe4",
    colorInner: "#0f172a",
    colorOuter: "#0e7490",
    blending: "normal",
  },
};

export function resolvePalette(theme: Theme): ParticlePalette {
  return PALETTES[theme];
}
