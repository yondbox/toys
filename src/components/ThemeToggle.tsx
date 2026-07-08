"use client";

import { useEffect, useState } from "react";
import {
  applyTheme,
  getInitialTheme,
  type Theme,
  toggleTheme,
  writeTheme,
} from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function handleClick() {
    const nextTheme = toggleTheme(theme);
    applyTheme(nextTheme);
    writeTheme(nextTheme);
    setTheme(nextTheme);
  }

  return (
    <button
      type="button"
      data-testid="theme-toggle"
      // SSR は theme="light" 固定、client は localStorage/matchMedia で決まるため
      // 意図的な不一致。suppressHydrationWarning でエラーを抑制する。
      suppressHydrationWarning
      aria-label={
        theme === "dark" ? "ライトテーマにする" : "ダークテーマにする"
      }
      onClick={handleClick}
      className="fixed top-3 right-3 z-50 grid size-11 place-items-center rounded-full border border-zinc-200 bg-white/90 font-bold text-lg text-zinc-800 shadow-sm backdrop-blur transition-colors hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-100 dark:hover:border-zinc-500"
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
