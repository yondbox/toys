import { readString, writeString } from "./storage";

/**
 * アプリ全体で扱うテーマ値。
 *
 * CSS は `html[data-theme]` を見て切り替えるため、保存値もこの2値に限定する。
 */
export type Theme = "light" | "dark";

/**
 * localStorage に保存するテーマ設定の論理キー。
 *
 * 実キーには storage 層が `toys:` を付けるため、ここでは機能名だけを持つ。
 */
const THEME_KEY = "theme";

/**
 * 保存値が現行のテーマ値として有効かを判定する。
 *
 * 手動編集や旧実装の値は無視し、OS 設定へのフォールバックを使う。
 */
function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

/**
 * localStorage に保存済みのテーマを読み出す。
 *
 * 保存値が壊れている場合は `null` を返し、呼び出し側がシステム設定へ戻せるようにする。
 */
export function readStoredTheme(): Theme | null {
  /** namespace 付き storage から読んだ保存値。型ガードを通るまで信用しない。 */
  const value = readString(THEME_KEY);
  return isTheme(value) ? value : null;
}

/**
 * ユーザーが選んだテーマを保存する。
 *
 * storage 層が例外を握りつぶすため、保存できない環境でもクリック操作自体は継続できる。
 */
export function writeTheme(theme: Theme): void {
  writeString(THEME_KEY, theme);
}

/**
 * OS の color scheme から初期テーマを解決する。
 *
 * SSR や matchMedia がないテスト環境では light を返し、初期描画で DOM 依存の例外を避ける。
 */
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

/**
 * アプリ起動時に使うテーマを決める。
 *
 * ユーザーの明示的な保存値を OS 設定より優先し、保存がないときだけ system を参照する。
 */
export function getInitialTheme(): Theme {
  return readStoredTheme() ?? resolveSystemTheme();
}

/**
 * 現在のテーマを `html[data-theme]` へ反映する。
 *
 * Tailwind v4 のダークテーマ切替を属性に寄せ、ページごとの実装が theme state を持たなくてよいようにする。
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.dataset.theme = theme;
}

/**
 * テーマ切替ボタン用に反対側のテーマを返す。
 *
 * 分岐を UI から切り出し、保存・DOM 反映・テストで同じ切替規則を使う。
 */
export function toggleTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}
