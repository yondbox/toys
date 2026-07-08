# Implementation Plan: けいさん れんしゅうゲーム（四則演算への再構成）

**Branch**: `002-math-game-redesign` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-math-game-redesign/spec.md`

## Summary

既存の「たしざんタイムアタック」を、四則演算（＋−×÷・ミックス）× 3 レベルに対応し、
画面テンキーで遊べ、自己ベストを端末に保存する計算ゲームへ発展させる。あわせて、アプリ全体
（トップページ＋全おもちゃ）のダーク／ライト切り替えを追加し、設定を名前空間分離した
ローカルストレージへ保存する。スマートフォンのたて向きを主対象にレイアウトを最適化する。

技術方針: おもちゃ本体は新スラッグ `keisan-game` にコロケーションし、純粋な状態機械
（reducer）と演算ごとの問題生成ストラテジ、記録の読み書きを分離する。テーマとローカル
ストレージ基盤はアプリ横断の関心事のため `src/lib` / `src/components` に共有配置し、消費者
（ルートレイアウト＝全ルート、記録＝ keisan-game）を明示する。Tailwind CSS v4 の dark 変種を
`prefers-color-scheme` ベースから `data-theme` 属性ベースへ切り替え、初回描画前のインライン
スクリプトでちらつきを防ぐ。

## Technical Context

**Language/Version**: TypeScript (strict), Node.js 24+

**Primary Dependencies**: Next.js 16 (App Router, Turbopack), React 19 (React Compiler),
Tailwind CSS v4

**Storage**: ブラウザ localStorage。全キーを `toys:` 接頭辞で名前空間分離する。テーマは
アプリ共有キー `toys:theme`、自己ベストはおもちゃ固有キー `toys:keisan-game:best`。保存不能
（プライベートブラウズ等）・破損値では既定へ安全にフォールバックし、操作を止めない（FR-031/032）。

**Testing**: Vitest + Testing Library（reducer・問題生成・記録・コンポーネント）、Playwright
（ユーザージャーニー。375×667 のたて向きスマホ視点、ダーク／ライト、テーマのアプリ横断反映を含む）

**Target Platform**: モダンブラウザ（スマートフォン・タブレット・PC）。スマホはたて向き主対象。

**Project Type**: 単一 Next.js Web アプリ（Route Group でおもちゃを分離）

**Performance Goals**: 入力・正誤表示は体感 60fps。テーマは初回描画前に確定させ、誤配色の
一瞬の表示（FOUC）を出さない（FR-030）。

**Constraints**: たて向きスマホ（幅 375px・高さ 667px 相当）でプレイ画面を縦スクロールなしに
1 画面へ収める（FR-036, SC-010）。幅 375px 以上で全画面・全おもちゃに横スクロールを出さない
（FR-037, SC-011）。テンキー等のタッチターゲットは最低 48px 四方相当（FR-008）。

**Scale/Scope**: 画面 4 状態（ホーム／カウントダウン／プレイ／結果）× 5 演算 × 3 レベル ×
2 モード。おもちゃ 1 つの置き換え＋アプリ横断のテーマ基盤。

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **User value and isolation**: `keisan-game` は独立して検証可能な計算ゲーム 1 つ。既存
  `addition-game` の撤去は「計算おもちゃを 1 つに保ちつつ四則演算へ発展させる」という本フィーチャー
  そのものの範囲であり、無関係な別おもちゃ（`counter`）のコードは変更しない。テーマ導入は
  ルートレイアウト・グローバル CSS という **意図的に更新する共有コントラクト** に閉じ、各おもちゃ
  固有コードは書き換えない（憲法 I の許容範囲）。
- **Colocation**: ゲーム固有コード（reducer・問題生成・記録・テンキー・テスト）はすべて
  `src/app/(toys)/keisan-game/` に置く。共有配置は 2 つだけで消費者を明示する：`src/lib/storage.ts`
  （消費者＝テーマ〔アプリ全体〕と keisan-game の記録）、`src/lib/theme.ts` と
  `src/components/ThemeToggle.tsx`（消費者＝ルートレイアウト経由で全ルート）。
- **SOLID and readability**: 演算ごとの問題生成は共通シグネチャの純関数ストラテジに分け、
  演算追加時に既存を壊さない（OCP）。reducer は純関数で乱数・時刻を注入（テスト決定性）。
  localStorage アクセスは `storage.ts` の狭い境界に隔離し、ドメインは具体 API に依存しない（DIP）。
- **Comments**: 意図コメントを残す対象を特定済み — ちらつき防止のブート script が「初回描画前に
  同期実行する」理由、あまり算の「両欄がそろって判定」する不変条件、テーマ変種を属性ベースへ
  切り替えた理由。コードの逐語コメントは付けない。
- **Vertical slices**: US1（四則演算＋テンキーの練習）→ US2（タイムアタック＋自己ベスト）→
  US3（アプリ全体テーマ）の順に独立検証可能。共有の前提タスク（`new-toy` 雛形・`storage.ts`・
  dark 変種切替）は最小限にとどめ、解放するスライスを明記する。
- **Fixed tooling**: pnpm・Biome・strict TypeScript・固定スタックを使用。マージ前に `pnpm lint`
  `pnpm typecheck` `pnpm test:unit` `pnpm build` `pnpm test:e2e` を通す。

## Project Structure

### Documentation (this feature)

```text
specs/002-math-game-redesign/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── ui-contract.md   # Phase 1 output
├── checklists/
│   └── requirements.md  # /speckit-specify で作成済み
└── tasks.md             # /speckit-tasks で作成（この計画では作らない）
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (toys)/
│   │   └── keisan-game/              # ← 新規（pnpm new-toy keisan-game）
│   │       ├── page.tsx              # client。4 画面の描画と入出力配線
│   │       ├── game.ts               # 純関数。状態機械 reducer・セッション遷移
│   │       ├── operations.ts         # 純関数。演算×レベルの生成ストラテジと出題範囲
│   │       ├── records.ts            # 自己ベストの読み書き（storage.ts を利用）
│   │       ├── Keypad.tsx            # client。画面テンキー（0-9・けす・ぜんぶけす・OK）
│   │       ├── game.test.ts          # reducer・遷移のユニットテスト
│   │       ├── operations.test.ts    # 生成範囲・制約（負・0除算・割り切れ）のテスト
│   │       └── page.test.tsx         # コンポーネント／画面遷移テスト
│   ├── layout.tsx                    # ← 変更。data-theme 適用・ThemeToggle 配置・ブート script
│   ├── globals.css                   # ← 変更。dark 変種を属性ベース化・子ども向けトークン
│   └── page.tsx                      # （テーマは CSS 変数/変種で自動追従。必要時のみ微修正）
├── components/
│   └── ThemeToggle.tsx               # ← 新規（共有）。消費者＝ルートレイアウト＝全ルート
├── lib/
│   ├── theme.ts                      # ← 新規（共有）。Theme 型・system 判定・read/write
│   └── storage.ts                    # ← 新規（共有）。名前空間付き・失敗許容の localStorage
└── toys/
    └── registry.ts                   # ← 変更。addition-game を除去し keisan-game を登録

# 撤去
src/app/(toys)/addition-game/         # ← 削除（keisan-game へ発展的に置き換え）

e2e/
└── keisan-game.spec.ts               # ジャーニー（モバイル視点・ダーク/ライト・アプリ横断）
```

**Structure Decision**:

おもちゃ固有コードは `src/app/(toys)/keisan-game/` にコロケーションする（憲法 II）。001 の
たしざんは 2 ファイルだったが、本フィーチャーは責務が増えるため、変更理由の異なる単位で分割する：

- `game.ts` — セッションの状態機械が変わるときだけ変更（React/DOM/タイマー非依存の純関数）。
- `operations.ts` — 演算の出題範囲・生成規則が変わるときだけ変更。演算ごとの生成器を共通
  シグネチャのストラテジとして持ち、`game.ts` はそれを注入して使う（OCP/依存方向の固定）。
- `records.ts` — 自己ベストの永続化ポリシーが変わるときだけ変更。キー生成と読み書きを
  `storage.ts`（共有境界）に委譲する。
- `Keypad.tsx` — テンキーの見た目・操作が変わるときだけ変更。`page.tsx` の肥大化を防ぐ。

共有配置は 3 ファイルで、いずれも複数ルートにまたがる安定した責務を持つ：

- `src/lib/storage.ts` — 名前空間 `toys:` を強制し、保存不能・JSON 破損を握りつぶして既定へ
  フォールバックする薄いラッパ。消費者＝テーマ（アプリ全体）と keisan-game の記録。他のおもちゃ
  （`counter` 等）が将来使う際も衝突しない土台（FR-031/032）。
- `src/lib/theme.ts` — `Theme = "light" | "dark"`、保存値の read/write、`system` の解決。消費者＝
  `ThemeToggle` とレイアウトのブート script。
- `src/components/ThemeToggle.tsx` — ライト/ダークの切替 UI。ルートレイアウトに置き、全ルート
  （トップ＋全おもちゃ）に表示（FR-027/028）。

テーマはアプリ横断の関心事のため、`src/app/layout.tsx` と `src/app/globals.css` を更新する。これは
憲法 I が許す「意図的に更新する共有コントラクト」であり、各おもちゃの固有コードには手を入れない。
`counter` を含む既存おもちゃは、属性ベースの dark 変種と CSS 変数を通じて自動的に追従する。

## Complexity Tracking

> 憲法違反ではないが、通常の「1 おもちゃ＝自己完結」を越えてアプリ横断の共有変更を伴うため、
> 判断の根拠を明示する。

| 追加の複雑さ | なぜ必要か | 却下したより単純な案とその理由 |
|-----------|------------|-------------------------------|
| 共有のテーマ基盤（`lib/theme.ts`・`components/ThemeToggle.tsx`・layout/globals 変更） | テーマはトップ＋全おもちゃに一貫適用する要件（FR-028）で、本質的にアプリ横断。1 つのおもちゃ内に閉じられない。 | keisan-game 内に閉じる案：他のおもちゃ・トップに反映されず FR-028 を満たせない。 |
| Tailwind dark 変種を属性ベースへ切替 | 手動トグルで OS 設定を上書きする必要がある（FR-026/027/029）。`prefers-color-scheme` だけでは手動選択を保持・上書きできない。 | media 戦略のまま：ユーザーの手動選択を保存・優先できない。 |
| 共有 `lib/storage.ts` の新設 | 複数の独立した消費者（テーマ・記録）が、他おもちゃと衝突しない名前空間と失敗許容を必要とする（FR-031/032）。 | 各所で直接 localStorage を叩く：接頭辞や try/catch が分散・重複し、衝突・破損時の挙動が不揃いになる。 |
| `game.ts`/`operations.ts`/`records.ts`/`Keypad.tsx` の 4 分割 | 変更理由（状態遷移／出題規則／永続化／入力 UI）が独立しており、混在は単一責務を壊す。 | 001 同様の 2 ファイル：四則演算・あまり・記録・テンキーの追加で `page.tsx`/`game.ts` が過大になり可読性を損なう。 |
