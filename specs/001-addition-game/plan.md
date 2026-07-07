# Implementation Plan: たしざんタイムアタック

**Branch**: `feature/speckit` | **Date**: 2026-07-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-addition-game/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

小学生向けの足し算ゲームを、おもちゃ `addition-game` として 1 ルートで実装する。
難易度(きほん: 1桁同士 / じょうきゅう: 2桁同士)とモード(フリー / 10・30・50・
100問タイムアタック)を選び、キーボードだけ(数字・Enter・Escape・バックスペース)で
回答する。技術方針は「純粋な状態機械 + 薄い表示層」: ゲーム規則を React 非依存の
reducer と問題生成器 (`game.ts`) に隔離し、`page.tsx` はキーボード・タイマーの配線と
画面描画だけを担う。時間は `Date.now()` のタイムスタンプをアクションに載せて計測し、
正誤フィードバックはオーバーレイ表示、画面全体は行高固定のグリッドにして
状態遷移でレイアウトが動かないこと (FR-023 / SC-007) を Playwright で検証する。

## Technical Context

**Language/Version**: TypeScript (strict), Node.js 24+

**Primary Dependencies**: Next.js 16 (App Router / Turbopack), React 19 + React Compiler,
Tailwind CSS v4。新規依存の追加なし。

**Storage**: なし。セッション状態はメモリ内のみ(仕様の Assumptions どおり永続化しない)。

**Testing**: Vitest + Testing Library(jsdom・フェイクタイマー)、Playwright(chromium)
for user journeys

**Target Platform**: Modern web browsers via Next.js App Router(画面幅 320–1440px、
物理キーボード必須)

**Project Type**: Single Next.js web application(Route Group `(toys)` 内の 1 ルート)

**Performance Goals**: キー入力から答え表示更新まで 1 フレーム以内(FR-004 の即時表示)。
Enter から正誤表示まで同期レンダリング 0.2 秒以内 (SC-003)。タイムアタックの経過時間
表示は 0.1 秒刻みで更新 (FR-014)。

**Constraints**: クライアントサイドのみで完結。状態遷移・タイマー更新によるレイアウト
シフト 0 (FR-023 / SC-007)。正誤フィードバック表示は 0.5〜1.5 秒 (FR-008/009)。
数字入力は難易度別の桁数上限で打ち切り (FR-022)。

**Scale/Scope**: 1 ルート・5 画面状態(モード選択 / カウントダウン / 回答中 /
正誤表示 / 結果)。難易度 2 × モード 5 = 10 セッション構成。コロケーション
ファイル約 5 個 + E2E 1 本。

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **User value and isolation**: ✅ PASS — 1 おもちゃ = 1 ルート
  (`src/app/(toys)/addition-game/`)。既存の `counter` と共有コードには触れない。
  registry 追加は `pnpm new-toy` が行う。
- **Colocation**: ✅ PASS — ゲーム規則・画面・テストをすべて
  `src/app/(toys)/addition-game/` 配下にコロケーション。`src/components/`・`src/lib/`
  への昇格なし(共有消費者が存在しないため)。
- **SOLID and readability**: ✅ PASS — 変更理由で分割する: `game.ts`(ゲーム規則 =
  状態遷移・問題生成・難易度定義)と `page.tsx`(入出力の配線と表示)。reducer は
  純関数とし、乱数と現在時刻はアクション経由で注入(テスト容易性と React 19 の
  reducer 純度要件のため)。投機的な抽象・単一用途のファクトリは作らない。
- **Comments**: ✅ PASS — 意図コメントが必要な箇所を特定済み: フィードバック 800ms が
  FR-008/009 の 0.5〜1.5 秒制約に由来すること、問題の連続重複禁止 (FR-020) の
  再抽選ループ、レイアウト固定(行高・overlay)が FR-023 由来であること。
- **Vertical slices**: ✅ PASS — US1(フリーモード)→ US2(タイムアタック)→
  US3(じょうきゅう難易度)の順に、それぞれ独立検証可能なスライスで積み上げる。
  共有前提は雛形生成 (`pnpm new-toy`) と `game.ts` の骨格のみで、全スライスを
  アンブロックする。
- **Fixed tooling**: ✅ PASS — pnpm / Biome / strict TS / Next.js 16 + React 19 +
  Tailwind v4。品質ゲートは `pnpm lint`・`typecheck`・`test:unit`・`build`・`test:e2e`。

**Post-design re-check (Phase 1 完了後)**: ✅ PASS — data-model の状態機械は spec の
FR にのみ由来し追加抽象なし。contracts はルート・キーボード・タイミング・レイアウト
安定の観測可能な契約のみを定義。違反なし。

## Project Structure

### Documentation (this feature)

```text
specs/001-addition-game/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/
│   └── ui-contract.md   # Phase 1 output (/speckit.plan command)
├── prototype.html       # 仕様確認用の使い捨てプロトタイプ(実装の入力、参照のみ)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (toys)/
│   │   ├── addition-game/
│   │   │   ├── page.tsx        # "use client"。画面組み立て・キーボード/タイマー配線・Tailwind 表示
│   │   │   ├── page.test.tsx   # コンポーネントテスト(キーボード操作での画面遷移・表示)
│   │   │   ├── game.ts         # 純粋なゲーム規則: 型・難易度定義・reducer・問題生成
│   │   │   └── game.test.ts    # ゲーム規則のユニットテスト(FR 単位)
│   │   └── counter/            # 既存おもちゃ(変更しない)
│   ├── layout.tsx              # 変更しない
│   └── page.tsx                # 変更しない(一覧は registry から生成済み)
└── toys/
    └── registry.ts             # pnpm new-toy addition-game が 1 エントリ追記(手編集しない)

e2e/
└── addition-game.spec.ts       # US1〜US3 のジャーニー + レイアウト安定 (SC-007) + 320/1440px (SC-006)
```

**Structure Decision**: おもちゃ固有コードは全て `src/app/(toys)/addition-game/` に
コロケーションする(憲法 II)。責務分割は 2 ファイルのみ:

- `game.ts` — ゲーム規則が変わるときだけ変更する。React・DOM・タイマーに依存しない
  純関数群(状態機械 reducer、難易度定義、問題生成器)。乱数・現在時刻は引数/
  アクションで受け取る。
- `page.tsx` — 見た目と入出力配線が変わるときだけ変更する。`useReducer` +
  `keydown` リスナー + 100ms 表示タイマー + 画面 4 状態の描画。

共有コード(`src/components/`・`src/lib/`)への配置はなし: このおもちゃ以外に消費者が
いない。`page.tsx` が肥大化して読みにくくなった場合のみ、同ディレクトリ内で
`screens.tsx`(表示コンポーネント群)を分離してよい(ディレクトリ外へは出さない)。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

違反なし。記載事項なし。
