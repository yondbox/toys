# Quickstart: particle-morph（パーティクル・モーフィング）

**Date**: 2026-07-15 | **Plan**: [plan.md](./plan.md)

本フィーチャーの動作を端から端まで確認するための手順。要素・操作の期待値は
[contracts/ui-contract.md](./contracts/ui-contract.md)、ロジックの不変条件は
[data-model.md](./data-model.md) を参照。

## 前提

```bash
pnpm install          # 依存の取得（本フィーチャーで three が追加されている）
```

- Node.js 24+ / pnpm
- WebGL が使えるブラウザ（フォールバック確認の手順は後述）

## 開発サーバでの手動確認

```bash
pnpm dev
```

1. `http://localhost:3000/` を開く → 一覧に「パーティクル・モーフィング」がある（FR-001）
2. 開く → 粒子の球体（ラベル「きゅうたい」）が動いている（FR-002, SC-001）
3. クリック → 粒子がほどけて「むすびめ」へ再集結、ラベルが切り替わる（FR-003/004）
4. 変形中に連打 → 表示が壊れず、ラベルは 1 段ずつしか進まない（FR-007）
5. 5 回クリックで「きゅうたい」へ一巡する（FR-005, SC-003）
6. ポインタを粒子群に重ねる → 周辺の粒子が避け、離すと戻る（FR-008）
7. 何もせず約 8 秒待つ → 自動で次の造形へ（FR-010）
8. テーマ切替を押す → 再読み込みなしで配色が切り替わる（FR-011, SC-006）
9. ウィンドウを縮める・広げる → 造形が収まり、横スクロールが出ない（FR-014）
10. OS の「動きを減らす」を有効にして再読み込み → 自動変形・反発が止まる（FR-012）

WebGL フォールバック（FR-013）は、Chrome DevTools の
「Rendering → Emulate a focused page」では再現できないため、`--disable-webgl` 付きで
起動したブラウザ、または E2E のコンテキストオプションで確認する。

## 自動テスト

```bash
pnpm lint             # Biome
pnpm typecheck        # tsc --noEmit
pnpm test:unit        # Vitest: shapes / morph / palette の純関数と page 骨格
pnpm build            # 本番ビルド（Turbopack）
pnpm test:e2e         # Playwright: e2e/particle-morph.spec.ts を含む全ジャーニー
```

### ユニットテストが担保する範囲（research.md R11）

- `shapes.test.ts`: 各造形が `count × 3` の座標を返す・バウンディング内・シード決定性・
  Canvas 2D 不在時の `text` フォールバック
- `morph.test.ts`: シーケンス循環・進行度の値域と単調性・stagger の完了不変条件
  （progress=1 で全粒子完了）・変形中の要求無視・自動変形の発火とリセット
- `palette.test.ts`: light / dark それぞれの配色解決
- `page.test.tsx`: 見出し・ラベル・ヒント・戻るリンクの骨格（キャンバスはモック）

### E2E が担保する範囲

- 表示スモーク（キャンバス描画開始・コンソールエラーなし）
- クリックでのラベル遷移と一巡
- WebGL 無効コンテキストでのフォールバックメッセージ
- テーマ切替への追従

## 期待される最終状態

- 上記コマンド 5 つがすべて成功する（憲法の品質ゲート）
- 変更範囲が `src/app/(toys)/particle-morph/`・`src/toys/registry.ts`（自動登録）・
  `e2e/particle-morph.spec.ts`・`package.json` / `pnpm-lock.yaml` に閉じている

## 実装検証結果

2026-07-15 に以下を確認済み。

- `pnpm lint`: 成功
- `pnpm typecheck`: 成功
- `pnpm test:unit`: 成功（13 files / 102 tests）
- `pnpm build`: 成功（`/particle-morph` を含む 5 route を生成）
- `pnpm test:e2e`: 成功（23 tests）
- Playwright で一覧遷移、WebGL 表示、5 造形循環、変形中クリック無視、WebGL フォールバック、
  無操作自動変形、テーマ切替、reduced-motion、375px/回転相当 viewport の横スクロールなしを確認
- 変更範囲は `src/app/(toys)/particle-morph/`、`src/toys/registry.ts`、
  `e2e/particle-morph.spec.ts`、`package.json` / `pnpm-lock.yaml`、および本検証記録に限定
