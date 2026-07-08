# Research: けいさん れんしゅうゲーム（四則演算への再構成）

**Date**: 2026-07-08 | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

spec の Clarifications で UX の未確定点は解消済み。本フェーズでは実装方針の技術的判断を確定する。

## R1. おもちゃの置き換え（addition-game → keisan-game）

- **Decision**: 新スラッグ `keisan-game` を `pnpm new-toy keisan-game --title "けいさんゲーム"`
  で生成し、四則演算対応の実装を行う。既存 `addition-game`（ルートディレクトリと registry
  エントリ）は撤去する。
- **Rationale**: spec Assumptions で「計算おもちゃを 1 つに保ち、四則演算へ発展させる／複数に
  分割しない」と定めた。足し算専用の slug/タイトル/URL のままでは四則演算の実体と矛盾する。
  1 つを置き換えることで一覧に計算ゲームが 2 つ並ぶ事態を避ける。
- **Alternatives considered**:
  - slug を `addition-game` のまま中身だけ四則演算化 → URL・名称が実体と食い違い、憲法 IV の
    「名前は概念を表す」に反する。
  - addition-game を残して別途新規追加 → 計算おもちゃが重複し、Assumptions に反する。
- **Note**: registry からの addition-game 除去は手編集になる。AGENTS.md の「registry を手で編集
  しない」は新規追加の自動化を指すため、撤去は意図的な保守編集として plan に明記する。
  `new-toy` は keisan-game の登録を自動で行う。

## R2. Tailwind CSS v4 での手動ダークモード（属性ベース変種）

- **Decision**: `globals.css` に `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));`
  を定義し、`dark:` 変種を `<html data-theme="...">` 属性で駆動する。手動設定が無い間は
  ブート script が `matchMedia("(prefers-color-scheme: dark)")` を評価して属性を初期化する。
- **Rationale**: 現状は `prefers-color-scheme` ベース（globals.css の `@media`）で、OS 設定を
  上書きする手動トグルを保持できない。属性ベースにすると、保存済みの手動選択を最優先しつつ、
  未設定時は OS 設定へフォールバックできる（FR-026/027/029）。既存の `dark:` ユーティリティ
  （page.tsx 等）はそのまま活き、変種の解決先だけが変わる。
- **Alternatives considered**:
  - `.dark` クラス戦略 → 属性 `data-theme` と機能は同等。属性の方が「light/dark を明示的に持つ」
    セマンティクスが記録値と 1:1 で対応し読みやすい。
  - `media` のまま維持 → 手動上書き・保存という要件を満たせない（却下）。

## R3. テーマのちらつき（FOUC）防止

- **Decision**: `src/app/layout.tsx` の `<html>` 内・本文描画前に、同期実行の小さなインライン
  script（`dangerouslySetInnerHTML`）を置く。script は `toys:theme` を読み、`light`/`dark` なら
  その値を、無ければ `matchMedia` の結果を `document.documentElement.dataset.theme` に設定する。
- **Rationale**: React のハイドレーション後にテーマを当てると、初回に誤配色が一瞬見える。描画前の
  同期 script が唯一確実な回避策で、Next.js App Router でも定石（FR-030）。
- **Alternatives considered**:
  - `next-themes` 等の依存追加 → 依存を増やさず自前の数行で足りる（憲法：不要な抽象を足さない）。
  - Server 側での테마決定 → localStorage はサーバから読めず、Cookie 化はスコープ過剰。

## R4. 名前空間付きローカルストレージ基盤

- **Decision**: `src/lib/storage.ts` に接頭辞 `toys:` を強制する薄い型付きヘルパを置く。
  `readString/writeString`、`readJSON<T>(key, guard)/writeJSON` を提供し、`try/catch` で
  保存不能を、`guard`（型ガード関数）で破損値を握りつぶし、いずれも既定値へフォールバックする。
  キーは `themeKey()` と `keisanBestKey(op, level, target)` 等のビルダ経由で生成する。
- **Rationale**: 複数の独立消費者（テーマ＝アプリ全体、記録＝ keisan-game）が、他おもちゃと
  衝突しない名前空間と、プライベートブラウズ／容量超過／破損に対する一様な失敗許容を必要とする
  （FR-031/032）。境界を 1 か所に集約すると挙動が揃い、ドメインは localStorage API に直接依存しない。
- **Alternatives considered**:
  - 各所で直接 `localStorage` → 接頭辞と try/catch が分散・重複し、破損時挙動が不揃い（却下）。
  - IndexedDB → 単純なキー値に対して過剰（却下）。

## R5. あまりのあるわり算の答えモデルと入力

- **Decision**: 問題の答えを「単一値」または「商＋あまり」の 2 形態で表す。あまり算の
  プレイ画面は「こたえ」（商）と「あまり」の 2 つの入力欄を持ち、テンキーは現在フォーカス中の欄へ
  数字を入力する。両欄が空でない時のみ判定し、商・あまりの双方が一致で正解とする。
- **Rationale**: Clarification で「2 欄入力」を確定。学校の筆算の教え方に沿い、単一テンキーで
  2 値を扱える（FR-006）。
- **Alternatives considered**: 「13あまり2」を 1 欄に文字入力 → テンキーに「あまり」区切りキーが
  必要で子どもに複雑（却下）。

## R6. 演算×レベルの問題生成ストラテジ

- **Decision**: `operations.ts` に、演算ごとの生成器 `generate(level, rng): Problem` を共通
  シグネチャで実装し、`OPERATIONS` マップに登録する。各生成器は spec FR-003 の範囲と FR-004 の
  制約（ひき算は答え ≥ 0、わり算は割り切れる〔あまりレベルを除く〕、0 除算なし）を内部で保証する。
  ミックスは 4 演算の生成器から等確率で選ぶ。FR-005（直前と同一問題の回避）は再抽選で満たす。
- **Rationale**: 演算追加・範囲調整を局所化し、既存演算を壊さない（OCP）。純関数で rng を注入し
  テストを決定的にする。
- **Alternatives considered**: 巨大な switch を reducer 内に持つ → 分岐が肥大し単一責務を壊す（却下）。

## R7. たて向きスマホの 1 画面レイアウト

- **Decision**: プレイ画面を縦フレックス（`min-h-[100dvh]` の列）にし、上から HUD（進捗・時間）→
  式・答え → テンキーの 3 段に配置。テンキーを最下部の固定ブロックに置き、中央の式領域を可変
  高さにする。文字サイズは `clamp()` とビューポート幅で調整し、`overflow-x` を全体で禁止。
  タッチターゲットは最低 48px 四方（`min-h`/`min-w`）。`100dvh` で iOS のアドレスバー変動に対応。
- **Rationale**: 375×667 で縦スクロールなしに収め、テンキーを常に指の届く位置へ固定する要件
  （FR-036, SC-010）と、横スクロール禁止（FR-037, SC-011）を、追加ライブラリなしの Tailwind
  ユーティリティで満たせる。
- **Alternatives considered**: 固定 px レイアウト → 端末幅で破綻（却下）。`100vh` → iOS で下部が
  隠れる既知問題があるため `100dvh` を採用。

## R8. テスト戦略

- **Decision**: reducer と `operations.ts`・`records.ts` は Vitest で純粋にテスト（生成範囲・
  制約・記録の独立性・破損フォールバック）。画面遷移とテンキー操作は Testing Library。ジャーニーと
  非機能（375×667 で縦スクロールなし・横スクロールなし・ダーク初期化・手動切替のアプリ横断反映・
  再訪保持）は Playwright（`viewport` と `colorScheme` を指定）。
- **Rationale**: 憲法「最も狭い有効なレベルでテスト」。モバイル寸法とテーマ横断は E2E でしか
  観測できないため Playwright に割り当てる。
