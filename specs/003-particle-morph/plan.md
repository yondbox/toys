# Implementation Plan: particle-morph（パーティクル・モーフィング）

**Branch**: `003-particle-morph` | **Date**: 2026-07-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-particle-morph/spec.md`

## Summary

数万個の光る粒子が 5 種の造形（球体→トーラス結び目→渦巻銀河→波打つ平面→テキスト「あっ」）
へ崩れて再集結する鑑賞・体験型おもちゃを新規追加する。クリック／タップ／Space で手動変形、
無操作約 8 秒で自動変形、ポインタ接近で粒子が避け、アプリ共通のライト／ダークテーマに配色が
即時追従する。

技術方針: 描画は Three.js（`three` のみ追加、ラッパーライブラリなし）を使い、クライアント
コンポーネントの `useEffect` で命令的にライフサイクル管理する。変形は頂点シェーダーで
`aPositionFrom`／`aPositionTo` を粒子ごとの遅延 `aDelay` 付きで補間し（stagger）、CPU は
easing 済みの進行度を uniform で渡すだけにして数万粒子でも 60fps を保つ。造形の座標生成・
変形の進行制御・テーマパレット解決は three 非依存の純関数に分離して Vitest で検証し、
WebGL 描画自体は Playwright のスモークで担保する。テーマは既存の `html[data-theme]` を
`MutationObserver` で監視して追従する。

## Technical Context

**Language/Version**: TypeScript (strict), Node.js 24+

**Primary Dependencies**: Next.js 16 (App Router, Turbopack), React 19 (React Compiler),
Tailwind CSS v4、**Three.js（`three`、本フィーチャーで新規追加。型定義同梱）**

**Storage**: なし（新規の保存データなし。テーマはアプリ共有の既存機構 `toys:theme` を
読むだけで、本おもちゃからの書き込みはしない）

**Testing**: Vitest（造形生成・変形進行・シーケンス・パレット解決の純関数）、Playwright
（表示スモーク・変形操作・フォールバック・コンソールエラーなし）。jsdom は WebGL を
持たないため、three に触るモジュールはユニットテスト対象から明示的に外す

**Target Platform**: WebGL が使えるモダンブラウザ（スマートフォン・タブレット・PC）。
非対応環境はメッセージ表示のフォールバック（FR-013）

**Project Type**: 単一 Next.js Web アプリ（Route Group でおもちゃを分離）

**Performance Goals**: 約 24,000 粒子で体感 60fps（SC-005）。変形は操作から 0.5 秒以内に
開始し 1〜3 秒で完了（SC-002）。devicePixelRatio は 2 でクランプし高 DPI 端末の負荷を抑える

**Constraints**: 変形計算を GPU（頂点シェーダー）に置き、CPU の毎フレーム処理は uniform
更新のみとする。`prefers-reduced-motion` で自動変形・反発を停止（FR-012）。リサイズ・回転
追従、横スクロール禁止（FR-014）。アンマウント時に WebGL リソース（geometry / material /
renderer）を dispose しメモリリークを防ぐ

**Scale/Scope**: おもちゃ 1 つの新規追加。5 造形 × 約 24,000 粒子、画面は 1 状態（+
フォールバック表示）。共有コード（`src/lib`・`src/components`）の変更なし

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **User value and isolation**: `particle-morph` は独立して検証可能な鑑賞型おもちゃ 1 つ。
  変更は `src/app/(toys)/particle-morph/` 配下・`src/toys/registry.ts`（`pnpm new-toy` に
  よる自動登録）・`e2e/particle-morph.spec.ts`・`package.json`（`three` 追加）に閉じ、
  既存おもちゃ・トップページ・共有コントラクトのコードは変更しない。
- **Colocation**: 造形生成・変形制御・シェーダー・シーン構築・キャンバスコンポーネント・
  テストをすべて `src/app/(toys)/particle-morph/` にコロケーションする。`src/components/`
  `src/lib/` への新規配置は **なし**（three を使うおもちゃが 2 つ以上になるまで共有化しない）。
  テーマは既存共有機構を読み取り専用で利用する。
- **SOLID and readability**: three / WebGL に依存する層（`scene.ts`・`ParticleCanvas.tsx`）と
  純ロジック層（`shapes.ts`・`morph.ts`・`palette.ts`）を分離し、ドメインロジックが描画
  インフラに依存しない（DIP）。造形は「粒子数 → 座標配列」の共通シグネチャを持つ純関数と
  して追加に開く（OCP）。乱数はシード注入で決定的にしテスト可能にする。
- **Comments**: 意図コメントを残す対象を特定済み — stagger 補間の式（全粒子が t=1 で必ず
  完了する不変条件）、テキスト造形を canvas ピクセルサンプリングで生成する理由（フォント
  ファイル不要・日本語対応）、DPR クランプと dispose の理由、`MutationObserver` でテーマを
  監視する理由（テーマ状態を page が持たない既存設計への追従）。逐語コメントは付けない。
- **Vertical slices**: US1（表示と手動変形）→ US2（ポインタ反発・視差）→ US3（自動変形）→
  US4（テーマ連動）の順に独立検証可能。共有の前提タスク（`pnpm new-toy` 雛形と `three`
  追加）は最小限で、US1〜US4 すべてを解放する。
- **Fixed tooling**: pnpm・Biome・strict TypeScript・固定スタックを使用。`three` の追加は
  `pnpm add three` で行う。マージ前に `pnpm lint` `pnpm typecheck` `pnpm test:unit`
  `pnpm build` `pnpm test:e2e` を通す。

## Project Structure

### Documentation (this feature)

```text
specs/003-particle-morph/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── ui-contract.md   # Phase 1 output（ページ UI の観測可能な契約）
├── checklists/
│   └── requirements.md  # /speckit-specify output
└── tasks.md             # Phase 2 output（/speckit-tasks が生成。本コマンドでは作らない）
```

### Source Code (repository root)

```text
src/
├── app/
│   └── (toys)/
│       └── particle-morph/
│           ├── page.tsx              # ページ全体。見出し・造形名ラベル・ヒント・戻るリンク・
│           │                         #   フォールバック表示の出し分け
│           ├── page.test.tsx         # ページ骨格のユニットテスト（キャンバスはモック）
│           ├── ParticleCanvas.tsx    # three のライフサイクル境界（生成・resize・テーマ監視・
│           │                         #   reduced-motion・dispose）。Client Component
│           ├── scene.ts              # three のシーン構築とフレーム更新。WebGL 依存を隔離
│           ├── shaders.ts            # 頂点・フラグメントシェーダー（GLSL 文字列）
│           ├── shapes.ts             # 造形 5 種の座標生成（純関数・シード注入で決定的）
│           ├── shapes.test.ts
│           ├── morph.ts              # 造形シーケンス・変形進行度・stagger・自動変形タイマーの
│           │                         #   純ロジック
│           ├── morph.test.ts
│           ├── palette.ts            # テーマ → 配色パレットの解決（純関数）
│           └── palette.test.ts
└── toys/
    └── registry.ts                   # pnpm new-toy による自動登録のみ（手編集しない）

e2e/
└── particle-morph.spec.ts            # 表示・変形操作・造形名切替・エラーなしのスモーク
```

**Structure Decision**: 本フィーチャーの新規コードはすべて
`src/app/(toys)/particle-morph/` にコロケーションする。共有ディレクトリへの追加はない。
リポジトリ横断で触るのは (1) `src/toys/registry.ts` — `pnpm new-toy particle-morph` の
自動登録（手編集禁止の規約に従う）、(2) `package.json` / `pnpm-lock.yaml` — `three` の依存
追加、(3) `e2e/particle-morph.spec.ts` — 既存の e2e 配置慣例（`e2e/<slug>.spec.ts`）への
追加、の 3 点のみ。three 依存コード（`scene.ts`・`shaders.ts`・`ParticleCanvas.tsx`）と
純ロジック（`shapes.ts`・`morph.ts`・`palette.ts`）の境界は「jsdom でテストできるか」で
引いており、ユニットテストは後者のみを対象にする。

## Complexity Tracking

違反なし（記載不要）。

依存追加 `three` は憲法の固定スタック（Next.js / React / TypeScript / Tailwind / Biome /
pnpm）と競合しない描画ライブラリの追加であり、代替（CSS / Canvas 2D では数万粒子の 3D 変形
表現が SC-005 の性能で成立しない）は research.md に記録した。ラッパー
（`@react-three/fiber` 等）は React Compiler との相性リスクと依存増を避けるため導入しない。
