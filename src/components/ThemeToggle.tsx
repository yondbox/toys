"use client";

import { useEffect, useState } from "react";
import {
  applyTheme,
  getInitialTheme,
  type Theme,
  toggleTheme,
  writeTheme,
} from "@/lib/theme";

/**
 * アプリ全体の light/dark を切り替える固定ボタン。
 *
 * 各おもちゃが個別にテーマ UI を持たなくてよいよう、root layout から一度だけ配置する。
 */
export function ThemeToggle() {
  /** 初期表示で使うテーマ。保存値があれば優先し、なければ OS 設定から解決する。 */
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  /**
   * state のテーマを DOM 属性へ反映する。
   *
   * 初回 mount 時にも走らせ、SSR 時点の light 固定表示を client 側の実テーマへ同期する。
   */
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  /**
   * 次のテーマへ切り替え、DOM・localStorage・React state を同じ値にそろえる。
   *
   * 先に DOM へ反映してクリック直後の見た目を変え、保存失敗時も state 更新は継続する。
   */
  function handleClick() {
    /** 現在とは反対側のテーマ。保存と表示の両方に同じ値を使う。 */
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
