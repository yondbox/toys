import type { Theme } from "@/lib/theme";

/**
 * Three.js シーンへ渡すテーマ別の描画色。
 */
export type ParticlePalette = {
  /** renderer の clear color として使う背景色。 */
  background: string;
  /** 粒子の中心色。fragment shader の core 部分に使う。 */
  colorInner: string;
  /** 粒子の外周色。halo と奥行きの色に使う。 */
  colorOuter: string;
  /** 暗色テーマでは発光感、明色テーマでは読みやすさを優先するためのブレンド方式。 */
  blending: "additive" | "normal";
};

/**
 * アプリテーマごとのパーティクル描画パレット。
 *
 * 明色テーマで加算合成を使うと粒子が白飛びするため、テーマごとに blending も切り替える。
 */
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

/**
 * アプリテーマからパーティクル用パレットを取得する。
 *
 * @param theme - `Theme` が取り得るアプリテーマ。
 * @returns Three.js シーンへそのまま適用できる色とブレンド方式。
 */
export function resolvePalette(theme: Theme): ParticlePalette {
  return PALETTES[theme];
}
