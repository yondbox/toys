import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

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

beforeEach(() => {
  mockColorScheme(false);
  document.documentElement.removeAttribute("data-theme");
});

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
