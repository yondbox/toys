import type { Metadata } from "next";
import { Geist_Mono, M_PLUS_Rounded_1c } from "next/font/google";
import Script from "next/script";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

/**
 * ひらがな中心の UI で使う丸ゴシック系フォント。
 *
 * `preload: false` にして、日本語フォントの巨大な preload を避けつつ CSS 変数で全体へ渡す。
 */
const roundedSans = M_PLUS_Rounded_1c({
  variable: "--font-rounded-sans",
  weight: ["400", "500", "700", "800", "900"],
  preload: false,
});

/**
 * コードや数値表示用の補助 monospace フォント。
 *
 * Next.js の font loader 経由で CSS 変数化し、必要な箇所だけが参照できるようにする。
 */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * アプリ全体のメタデータ。
 *
 * 1ページ完結のおもちゃを一覧するサイトなので、個別のおもちゃ名ではなくコレクション名を置く。
 */
export const metadata: Metadata = {
  title: "toys",
  description: "小さな Web アプリのコレクション",
};

/**
 * React hydration 前に保存済みテーマを `html[data-theme]` へ反映する inline script。
 *
 * テーマのちらつきを抑えるため、React コンポーネントが mount する前に localStorage と
 * OS 設定を読んで属性を決める。失敗時は light に倒して初期描画を止めない。
 */
const themeInitScript = `
(() => {
  try {
    const stored = window.localStorage.getItem("toys:theme");
    const theme = stored === "light" || stored === "dark"
      ? stored
      : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    document.documentElement.dataset.theme = theme;
  } catch {
    document.documentElement.dataset.theme = "light";
  }
})();`;

/**
 * root layout が受け取る子ページ。
 *
 * テーマ初期化とトグルを全ページ共通にするため、各 toy は children として差し込むだけにする。
 */
type RootLayoutProps = Readonly<{
  /** 現在の route が描画するページ内容。 */
  children: React.ReactNode;
}>;

/**
 * すべてのページを包む root layout。
 *
 * フォント変数、テーマ初期化 script、テーマ切替ボタンをここに集約し、
 * 各おもちゃの実装が共通 UI を持ち回らなくてよいようにする。
 */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="ja"
      suppressHydrationWarning
      className={`${roundedSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
