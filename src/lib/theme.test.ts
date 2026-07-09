import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyTheme,
  getInitialTheme,
  readStoredTheme,
  resolveSystemTheme,
  toggleTheme,
  writeTheme,
} from "./theme";

/**
 * matchMedia の color scheme 結果を差し替える。
 *
 * OS テーマに依存する分岐を決定的にテストし、実行環境の設定で期待値が変わらないようにする。
 */
function mockColorScheme(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

/**
 * 各テストの既定 OS テーマを light にそろえる。
 *
 * 保存値優先と system fallback のテストが、前ケースや実マシン設定に影響されないようにする。
 */
beforeEach(() => {
  mockColorScheme(false);
  document.documentElement.removeAttribute("data-theme");
});

/**
 * テーマ保存値・DOM 属性・mock をテスト間で初期化する。
 *
 * `data-theme` は documentElement に残るため、明示的に消して初期反映テストを独立させる。
 */
afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  document.documentElement.removeAttribute("data-theme");
});

describe("テーマ設定の保存 (FR-026/029/031/032)", () => {
  it("toys:theme に light/dark を保存して読み出す", () => {
    writeTheme("dark");
    expect(localStorage.getItem("toys:theme")).toBe("dark");
    expect(readStoredTheme()).toBe("dark");
  });

  it("未保存・破損値は null にフォールバックする", () => {
    expect(readStoredTheme()).toBeNull();
    localStorage.setItem("toys:theme", "blue");
    expect(readStoredTheme()).toBeNull();
  });

  it("未保存時は system の color scheme を解決する", () => {
    mockColorScheme(true);
    expect(resolveSystemTheme()).toBe("dark");
    expect(getInitialTheme()).toBe("dark");
  });

  it("保存値は system より優先される", () => {
    mockColorScheme(true);
    writeTheme("light");
    expect(getInitialTheme()).toBe("light");
  });

  it("documentElement の data-theme を反映し、toggle は light/dark を反転する", () => {
    applyTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(toggleTheme("dark")).toBe("light");
    expect(toggleTheme("light")).toBe("dark");
  });
});
