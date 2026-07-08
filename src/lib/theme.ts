import { readString, writeString } from "./storage";

export type Theme = "light" | "dark";

const THEME_KEY = "theme";

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

export function readStoredTheme(): Theme | null {
  const value = readString(THEME_KEY);
  return isTheme(value) ? value : null;
}

export function writeTheme(theme: Theme): void {
  writeString(THEME_KEY, theme);
}

export function resolveSystemTheme(): Theme {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function getInitialTheme(): Theme {
  return readStoredTheme() ?? resolveSystemTheme();
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.dataset.theme = theme;
}

export function toggleTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}
