import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyTheme,
  getInitialTheme,
  readStoredTheme,
  resolveSystemTheme,
  toggleTheme,
  writeTheme,
} from "./theme";

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
