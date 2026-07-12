import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

/**
 * ThemeToggle が参照する matchMedia をテスト用に差し替える。
 *
 * OS テーマの差を固定し、保存値がない初期表示の期待値を実行環境から切り離す。
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
 * 各テストの初期テーマ環境を light 相当に戻す。
 *
 * 前ケースの `data-theme` が残ると初期反映の検証が読みにくくなるため、DOM 属性も消す。
 */
beforeEach(() => {
  mockColorScheme(false);
  document.documentElement.removeAttribute("data-theme");
});

/**
 * ThemeToggle の保存値・DOM 属性・matchMedia mock を後片付けする。
 *
 * コンポーネントは localStorage と documentElement に副作用を持つため、テスト間で明示的に分離する。
 */
afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  document.documentElement.removeAttribute("data-theme");
});

describe("ThemeToggle (FR-027/028/029)", () => {
  it("初期テーマを data-theme へ反映し、aria と data-testid を持つ", () => {
    localStorage.setItem("toys:theme", "dark");
    render(<ThemeToggle />);
    const button = screen.getByTestId("theme-toggle");
    expect(button.getAttribute("aria-label")).toContain("ライト");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("クリックで light と dark を切り替え、toys:theme に保存する", () => {
    render(<ThemeToggle />);
    const button = screen.getByTestId("theme-toggle");
    expect(document.documentElement.dataset.theme).toBe("light");

    fireEvent.click(button);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("toys:theme")).toBe("dark");

    fireEvent.click(button);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("toys:theme")).toBe("light");
  });
});
